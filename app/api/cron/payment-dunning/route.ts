import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import {
  DUNNING_GRACE_DAYS,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from "@/lib/billing/dunning";

// Only re-send a reminder if at least this many hours have passed since the last
// one. Guards against a double-send when the cron runs slightly off its daily
// schedule, and against re-emailing the same day the webhook sent the first one.
const MIN_HOURS_BETWEEN_EMAILS = 20;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

type PastDueRow = {
  userId: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  pastDueSince: string | null;
  lastEmailedAt: string | null;
  emailCount: number;
  invoiceUrl: string | null;
  isTeam: boolean;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = Date.now();
  let reminded = 0;
  let canceled = 0;
  let errors = 0;

  try {
    // Gather past_due personal subscriptions and team subscriptions into one
    // list with a common shape.
    const { data: subs } = await admin
      .from("zeroed_subscriptions")
      .select(
        "user_id, stripe_subscription_id, stripe_customer_id, past_due_since, dunning_last_emailed_at, dunning_email_count, latest_invoice_url"
      )
      .eq("status", "past_due")
      .not("past_due_since", "is", null);

    const { data: teams } = await admin
      .from("zeroed_teams")
      .select(
        "owner_id, stripe_subscription_id, stripe_customer_id, past_due_since, dunning_last_emailed_at, dunning_email_count, latest_invoice_url"
      )
      .eq("subscription_status", "past_due")
      .not("past_due_since", "is", null);

    const rows: PastDueRow[] = [
      ...(subs ?? []).map((s: any) => ({
        userId: s.user_id,
        stripeSubscriptionId: s.stripe_subscription_id,
        stripeCustomerId: s.stripe_customer_id,
        pastDueSince: s.past_due_since,
        lastEmailedAt: s.dunning_last_emailed_at,
        emailCount: s.dunning_email_count ?? 0,
        invoiceUrl: s.latest_invoice_url,
        isTeam: false,
      })),
      ...(teams ?? []).map((t: any) => ({
        userId: t.owner_id,
        stripeSubscriptionId: t.stripe_subscription_id,
        stripeCustomerId: t.stripe_customer_id,
        pastDueSince: t.past_due_since,
        lastEmailedAt: t.dunning_last_emailed_at,
        emailCount: t.dunning_email_count ?? 0,
        invoiceUrl: t.latest_invoice_url,
        isTeam: true,
      })),
    ];

    for (const row of rows) {
      if (!row.pastDueSince || !row.stripeCustomerId) continue;
      const table = row.isTeam ? "zeroed_teams" : "zeroed_subscriptions";
      const matchCol = "stripe_customer_id";

      try {
        const elapsedDays = (now - new Date(row.pastDueSince).getTime()) / MS_PER_DAY;

        // Grace window expired: cancel in Stripe (the subscription.deleted
        // webhook flips our status and clears the dunning clock) and send the
        // final email.
        if (elapsedDays >= DUNNING_GRACE_DAYS) {
          if (row.stripeSubscriptionId && stripe) {
            try {
              await stripe.subscriptions.cancel(row.stripeSubscriptionId);
            } catch (err: any) {
              // Already gone in Stripe: fall through to mark canceled locally.
              if (err?.code !== "resource_missing") throw err;
            }
          }
          // Defensively mark canceled locally in case the webhook is delayed.
          await admin
            .from(table)
            .update(
              row.isTeam
                ? { subscription_status: "canceled", past_due_since: null, dunning_email_count: 0 }
                : { status: "canceled", past_due_since: null, dunning_email_count: 0 }
            )
            .eq(matchCol, row.stripeCustomerId);
          await sendSubscriptionCanceledEmail(admin, {
            userId: row.userId,
            invoiceUrl: row.invoiceUrl,
            isTeam: row.isTeam,
          });
          canceled++;
          continue;
        }

        // Still in grace: send a daily reminder if enough time has passed.
        const hoursSinceEmail = row.lastEmailedAt
          ? (now - new Date(row.lastEmailedAt).getTime()) / MS_PER_HOUR
          : Infinity;
        if (hoursSinceEmail < MIN_HOURS_BETWEEN_EMAILS) continue;

        const daysLeft = Math.max(1, Math.ceil(DUNNING_GRACE_DAYS - elapsedDays));
        const sent = await sendPaymentFailedEmail(admin, {
          userId: row.userId,
          invoiceUrl: row.invoiceUrl,
          isTeam: row.isTeam,
          daysLeft,
        });
        if (sent) {
          await admin
            .from(table)
            .update({
              dunning_last_emailed_at: new Date(now).toISOString(),
              dunning_email_count: row.emailCount + 1,
            })
            .eq(matchCol, row.stripeCustomerId);
          reminded++;
        }
      } catch (err) {
        console.error(
          `Dunning failed for ${row.isTeam ? "team" : "user"} customer ${row.stripeCustomerId}:`,
          err
        );
        errors++;
      }
    }

    return NextResponse.json({ message: "Dunning processed", reminded, canceled, errors });
  } catch (error) {
    console.error("Payment-dunning cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
