import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { DUNNING_GRACE_DAYS, sendPaymentFailedEmail } from '@/lib/billing/dunning';
import { handleDisputeCreated, handleDisputeClosed } from '@/lib/billing/disputes';
import type Stripe from 'stripe';

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Idempotency: Stripe retries and can deliver out of order. Record each event
  // id once; if we've seen it, acknowledge and skip reprocessing.
  const { error: dupError } = await (getSupabaseAdmin() as any)
    .from('zeroed_stripe_events')
    .insert({ event_id: event.id, type: event.type });

  if (dupError) {
    if (dupError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Table missing or transient error: log and continue rather than drop the event.
    console.error('Stripe idempotency insert failed:', dupError);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(getSupabaseAdmin(), dispute);
        break;
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeClosed(getSupabaseAdmin(), dispute);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  // Team checkout: provision the team, not a personal subscription.
  const teamId = session.metadata?.team_id;
  if (teamId) {
    const { error } = await (getSupabaseAdmin() as any)
      .from('zeroed_teams')
      .update({
        subscription_status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId);
    if (error) console.error('Error provisioning team subscription:', error);
    return;
  }

  const userId = session.metadata?.supabase_user_id ||
    (session.subscription && typeof session.subscription === 'object'
      ? session.subscription.metadata?.supabase_user_id
      : undefined);

  if (!customerId && !userId) {
    console.error('Could not resolve customer or user for checkout session');
    return;
  }

  // Provision access immediately rather than depending on the ordering of the
  // separate customer.subscription.* event. Match by user id when available
  // (unique), else by the customer id stored during checkout.
  const update: Record<string, unknown> = {
    status: 'active',
    updated_at: new Date().toISOString(),
  };
  if (subscriptionId) update.stripe_subscription_id = subscriptionId;
  if (customerId) update.stripe_customer_id = customerId;

  const base = (getSupabaseAdmin() as any).from('zeroed_subscriptions').update(update);
  const { error } = userId
    ? await base.eq('user_id', userId)
    : await base.eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error provisioning subscription on checkout:', error);
  }
}

// Stripe moved current_period_start/end off the subscription onto each
// subscription item as of API version 2025-03-31. Read from the item first,
// then fall back to the legacy top-level field for older API versions.
function subscriptionPeriod(subscription: Stripe.Subscription) {
  const sub = subscription as any;
  const item = sub.items?.data?.[0] ?? {};
  const startUnix = item.current_period_start ?? sub.current_period_start ?? null;
  const endUnix = item.current_period_end ?? sub.current_period_end ?? null;
  return {
    current_period_start: startUnix ? new Date(startUnix * 1000).toISOString() : null,
    current_period_end: endUnix ? new Date(endUnix * 1000).toISOString() : null,
  };
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;
  const sub0 = subscription as any;
  const period = subscriptionPeriod(subscription);

  // Map Stripe status to our status
  let status: string;
  switch (subscription.status) {
    case 'active':
      status = 'active';
      break;
    case 'trialing':
      status = 'trialing';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
      status = 'canceled';
      break;
    default:
      status = subscription.status;
  }

  // Team subscription: update the team, not a personal subscription row.
  const teamId = sub0.metadata?.team_id;
  if (teamId) {
    const { error } = await (getSupabaseAdmin() as any)
      .from('zeroed_teams')
      .update({
        subscription_status: status,
        stripe_subscription_id: subscription.id,
        current_period_end: period.current_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId);
    if (error) console.error('Error updating team subscription:', error);
    return;
  }

  const { error } = await (getSupabaseAdmin() as any)
    .from('zeroed_subscriptions')
    .update({
      status,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price.id,
      current_period_start: period.current_period_start,
      current_period_end: period.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const teamId = (subscription as any).metadata?.team_id;
  if (teamId) {
    const { error } = await (getSupabaseAdmin() as any)
      .from('zeroed_teams')
      .update({
        subscription_status: 'canceled',
        stripe_subscription_id: null,
        past_due_since: null,
        dunning_last_emailed_at: null,
        dunning_email_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId);
    if (error) console.error('Error canceling team subscription:', error);
    return;
  }

  const { error } = await (getSupabaseAdmin() as any)
    .from('zeroed_subscriptions')
    .update({
      status: 'canceled',
      stripe_subscription_id: null,
      canceled_at: new Date().toISOString(),
      past_due_since: null,
      dunning_last_emailed_at: null,
      dunning_email_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error canceling subscription:', error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const admin = getSupabaseAdmin() as any;
  const invoiceUrl = (invoice as any).hosted_invoice_url as string | null;
  const nowIso = new Date().toISOString();

  // A given Stripe customer maps to either a personal subscriber OR a team
  // owner, not both. Find whichever it is, start the grace clock on the first
  // failure of a streak, and send the initial dunning email. The daily
  // reminders and the eventual cancel are driven by the payment-dunning cron.
  const { data: sub } = await admin
    .from('zeroed_subscriptions')
    .select('user_id, past_due_since')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (sub) {
    const firstFailure = !sub.past_due_since;
    const { error } = await admin
      .from('zeroed_subscriptions')
      .update({
        status: 'past_due',
        past_due_since: sub.past_due_since || nowIso,
        latest_invoice_url: invoiceUrl,
        updated_at: nowIso,
      })
      .eq('stripe_customer_id', customerId);
    if (error) console.error('Error updating subscription to past_due:', error);
    if (firstFailure) {
      await sendPaymentFailedEmail(admin, {
        userId: sub.user_id,
        invoiceUrl,
        isTeam: false,
        daysLeft: DUNNING_GRACE_DAYS,
      });
      await admin
        .from('zeroed_subscriptions')
        .update({ dunning_last_emailed_at: nowIso, dunning_email_count: 1 })
        .eq('stripe_customer_id', customerId);
    }
    return;
  }

  const { data: team } = await admin
    .from('zeroed_teams')
    .select('owner_id, past_due_since')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (team) {
    const firstFailure = !team.past_due_since;
    await admin
      .from('zeroed_teams')
      .update({
        subscription_status: 'past_due',
        past_due_since: team.past_due_since || nowIso,
        latest_invoice_url: invoiceUrl,
        updated_at: nowIso,
      })
      .eq('stripe_customer_id', customerId);
    if (firstFailure) {
      await sendPaymentFailedEmail(admin, {
        userId: team.owner_id,
        invoiceUrl,
        isTeam: true,
        daysLeft: DUNNING_GRACE_DAYS,
      });
      await admin
        .from('zeroed_teams')
        .update({ dunning_last_emailed_at: nowIso, dunning_email_count: 1 })
        .eq('stripe_customer_id', customerId);
    }
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  // If it was past_due, set back to active and clear the dunning clock so the
  // cron stops reminding and re-arms for any future failure streak.
  const admin = getSupabaseAdmin() as any;
  const cleared = {
    status: 'active',
    past_due_since: null,
    dunning_last_emailed_at: null,
    dunning_email_count: 0,
    latest_invoice_url: null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin
    .from('zeroed_subscriptions')
    .update(cleared)
    .eq('stripe_customer_id', customerId)
    .eq('status', 'past_due');
  if (error) {
    console.error('Error updating subscription to active:', error);
  }
  await admin
    .from('zeroed_teams')
    .update({
      subscription_status: 'active',
      past_due_since: null,
      dunning_last_emailed_at: null,
      dunning_email_count: 0,
      latest_invoice_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
    .eq('subscription_status', 'past_due');
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // Only revoke on a full refund; partial refunds keep access.
  if (!charge.refunded) return;
  const customerId = typeof charge.customer === 'string'
    ? charge.customer
    : charge.customer?.id;
  if (!customerId) return;

  const admin = getSupabaseAdmin() as any;
  const now = new Date().toISOString();
  await admin
    .from('zeroed_subscriptions')
    .update({ status: 'canceled', canceled_at: now, updated_at: now })
    .eq('stripe_customer_id', customerId);
  await admin
    .from('zeroed_teams')
    .update({ subscription_status: 'canceled', updated_at: now })
    .eq('stripe_customer_id', customerId);
}
