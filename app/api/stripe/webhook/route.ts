import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
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
  const userId = session.metadata?.supabase_user_id ||
    (session.subscription && typeof session.subscription === 'object'
      ? session.subscription.metadata?.supabase_user_id
      : null);

  if (!userId) {
    // Try to find by customer ID
    const { data: sub } = await getSupabaseAdmin()
      .from('zeroed_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', session.customer as string)
      .single();

    if (!sub) {
      console.error('Could not find user for checkout session');
      return;
    }
  }

  console.log('Checkout completed for user:', userId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

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

  // Cast subscription to any for fields that exist but aren't in current types
  const sub = subscription as any;
  const { error } = await (getSupabaseAdmin() as any)
    .from('zeroed_subscriptions')
    .update({
      status,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price.id,
      current_period_start: sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString()
        : null,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
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

  const { error } = await getSupabaseAdmin()
    .from('zeroed_subscriptions')
    .update({
      status: 'canceled',
      stripe_subscription_id: null,
      canceled_at: new Date().toISOString(),
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

  const { error } = await getSupabaseAdmin()
    .from('zeroed_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating subscription to past_due:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  // If it was past_due, set back to active
  const { error } = await getSupabaseAdmin()
    .from('zeroed_subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
    .eq('status', 'past_due');

  if (error) {
    console.error('Error updating subscription to active:', error);
  }
}
