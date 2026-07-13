import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, paymentFailedEmail, subscriptionCanceledEmail } from "@/lib/email";

// Grace window: how many days a past_due subscription keeps Pro access and
// receives daily pay-link reminders before it's canceled. Also enforced as a
// backstop in the check_subscription_access RPC.
export const DUNNING_GRACE_DAYS = 7;

// Resolve the pay link for a dunning email. Stripe's hosted invoice URL lets the
// customer pay the exact failed invoice in one click (which retries the charge);
// fall back to the pricing page if it's missing.
export function resolvePayLink(latestInvoiceUrl: string | null | undefined): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://getbruh.app";
  return latestInvoiceUrl || `${appUrl}/pricing`;
}

async function resolveUserEmail(
  admin: SupabaseClient,
  userId: string | null | undefined
): Promise<string | null> {
  if (!userId) return null;
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

// Send the "payment failed / update your card" email. Used for the initial
// failure notice and each daily reminder. Billing emails are transactional, so
// they bypass the user's notification-preference toggle.
export async function sendPaymentFailedEmail(
  admin: SupabaseClient,
  opts: { userId: string | null; invoiceUrl: string | null; isTeam: boolean; daysLeft: number }
): Promise<boolean> {
  const to = await resolveUserEmail(admin, opts.userId);
  if (!to) return false;
  const { subject, html } = paymentFailedEmail({
    payLink: resolvePayLink(opts.invoiceUrl),
    daysLeft: Math.max(0, opts.daysLeft),
    isTeam: opts.isTeam,
  });
  const res = await sendEmail({ to, subject, html, bypassSettingsCheck: true });
  return res.success;
}

// Send the final "subscription canceled" email once the grace window expires.
export async function sendSubscriptionCanceledEmail(
  admin: SupabaseClient,
  opts: { userId: string | null; invoiceUrl: string | null; isTeam: boolean }
): Promise<boolean> {
  const to = await resolveUserEmail(admin, opts.userId);
  if (!to) return false;
  const { subject, html } = subscriptionCanceledEmail({
    payLink: resolvePayLink(opts.invoiceUrl),
    isTeam: opts.isTeam,
  });
  const res = await sendEmail({ to, subject, html, bypassSettingsCheck: true });
  return res.success;
}
