import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { sendEmail, disputeAlertEmail } from "@/lib/email";
import { ADMIN_EMAILS } from "@/lib/admin";

// Auto-submit compiled evidence to Stripe. Evidence can only be submitted once,
// so if you'd rather review first, flip this to false — the handler will still
// revoke access, record the dispute, and alert the owner with the drafted
// evidence, leaving submission manual.
const AUTO_SUBMIT_EVIDENCE = true;

function formatAmount(amount: number, currency: string): string {
  return `$${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function dashboardUrl(disputeId: string): string {
  return `https://dashboard.stripe.com/disputes/${disputeId}`;
}

// Resolve the Stripe customer id behind a dispute via its charge.
async function customerIdForDispute(dispute: Stripe.Dispute): Promise<string | null> {
  const direct = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (!direct || !stripe) return null;
  try {
    const charge = await stripe.charges.retrieve(direct);
    return typeof charge.customer === "string" ? charge.customer : charge.customer?.id ?? null;
  } catch {
    return null;
  }
}

type Evidence = {
  product_description?: string;
  customer_name?: string;
  customer_email_address?: string;
  service_date?: string;
  access_activity_log?: string;
  uncategorized_text?: string;
};

// Compile dispute evidence from what we know about the account: signup, activity,
// subscription, and proof we delivered transactional email to the customer.
async function compileEvidence(
  admin: SupabaseClient,
  args: { userId: string | null; customerId: string; dispute: Stripe.Dispute }
): Promise<{ evidence: Evidence; summary: string; email: string }> {
  const { userId, customerId, dispute } = args;

  let email = "";
  let name = "";
  let createdAt: string | undefined;
  let lastSignIn: string | undefined;
  if (userId) {
    const { data } = await admin.auth.admin.getUserById(userId);
    email = data.user?.email ?? "";
    createdAt = data.user?.created_at ?? undefined;
    lastSignIn = data.user?.last_sign_in_at ?? undefined;
    name = (data.user?.user_metadata?.full_name as string) || "";
  }
  if (userId && !name) {
    const { data: prefs } = await admin
      .from("zeroed_user_preferences")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();
    name = (prefs as any)?.display_name || "";
  }
  name = name || email;

  const { data: sub } = await admin
    .from("zeroed_subscriptions")
    .select("created_at, current_period_start, current_period_end, stripe_price_id, status")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  let taskCount = 0;
  if (userId) {
    const { count } = await admin
      .from("zeroed_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    taskCount = count ?? 0;
  }

  let emailProof = "No transactional email records on file.";
  if (userId) {
    const { data: sends } = await admin
      .from("zeroed_email_sends")
      .select("email_type, subject, resend_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (sends && sends.length) {
      emailProof = sends
        .map(
          (s: any) =>
            `- ${new Date(s.created_at).toISOString()} — "${s.subject}" (${s.email_type})${s.resend_id ? ` [id ${s.resend_id}]` : ""}`
        )
        .join("\n");
    }
  }

  const serviceDate = (sub as any)?.created_at || createdAt;
  const activityLog = [
    createdAt ? `Account created: ${new Date(createdAt).toISOString()}` : null,
    lastSignIn ? `Last signed in: ${new Date(lastSignIn).toISOString()}` : null,
    `Tasks created in-app: ${taskCount}`,
  ]
    .filter(Boolean)
    .join("\n");

  const productDescription =
    "bruh. Pro — a monthly SaaS subscription to an AI-powered task manager and focus app at https://getbruh.app. Access is delivered instantly online upon payment.";

  const uncategorized = [
    "Digital SaaS subscription; access delivered online immediately on payment.",
    "",
    "ACCOUNT:",
    `Email: ${email}`,
    activityLog,
    "",
    "SUBSCRIPTION:",
    sub
      ? `Plan status: ${(sub as any).status}. Started: ${serviceDate ? new Date(serviceDate).toISOString() : "n/a"}. Current period: ${(sub as any).current_period_start ?? "n/a"} to ${(sub as any).current_period_end ?? "n/a"}.`
      : "No active subscription record found for this customer.",
    "",
    "TRANSACTIONAL EMAIL DELIVERED TO CUSTOMER:",
    emailProof,
    "",
    "TERMS & CANCELLATION:",
    "Customer agreed to the Terms of Service at signup (https://getbruh.app/terms). The subscription is self-serve and cancelable at any time from account settings; no cancellation request was received before this dispute.",
  ].join("\n");

  const evidence: Evidence = {
    product_description: productDescription,
    customer_name: name || undefined,
    customer_email_address: email || undefined,
    service_date: serviceDate ? new Date(serviceDate).toISOString().slice(0, 10) : undefined,
    access_activity_log: activityLog || undefined,
    uncategorized_text: uncategorized,
  };

  return { evidence, summary: uncategorized, email };
}

// Revoke Pro access for the disputing customer (personal or team).
async function revokeAccess(admin: SupabaseClient, customerId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data: sub } = await admin
    .from("zeroed_subscriptions")
    .update({ status: "canceled", canceled_at: now, updated_at: now })
    .eq("stripe_customer_id", customerId)
    .select("user_id");
  if (sub && sub.length) return true;
  const { data: team } = await admin
    .from("zeroed_teams")
    .update({ subscription_status: "canceled", updated_at: now })
    .eq("stripe_customer_id", customerId)
    .select("id");
  return !!(team && team.length);
}

export async function handleDisputeCreated(admin: SupabaseClient, dispute: Stripe.Dispute) {
  // Idempotency: record the dispute; bail if we've already processed it.
  const { data: existing } = await admin
    .from("zeroed_disputes")
    .select("evidence_submitted")
    .eq("stripe_dispute_id", dispute.id)
    .maybeSingle();
  if ((existing as any)?.evidence_submitted) return;

  const customerId = await customerIdForDispute(dispute);

  let userId: string | null = null;
  if (customerId) {
    const { data: sub } = await admin
      .from("zeroed_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = (sub as any)?.user_id ?? null;
    if (!userId) {
      const { data: team } = await admin
        .from("zeroed_teams")
        .select("owner_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      userId = (team as any)?.owner_id ?? null;
    }
  }

  const accessRevoked = customerId ? await revokeAccess(admin, customerId) : false;

  let evidenceSubmitted = false;
  let evidenceText = "Could not resolve the customer for this dispute; no evidence compiled.";
  let customerEmail = "unknown";

  if (customerId) {
    const compiled = await compileEvidence(admin, { userId, customerId, dispute });
    evidenceText = compiled.summary;
    customerEmail = compiled.email || "unknown";
    if (AUTO_SUBMIT_EVIDENCE && stripe) {
      try {
        await stripe.disputes.update(dispute.id, {
          evidence: compiled.evidence as Stripe.DisputeUpdateParams.Evidence,
          submit: true,
        });
        evidenceSubmitted = true;
      } catch (err) {
        console.error("Failed to submit dispute evidence:", err);
      }
    }
  }

  const dueBy = dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
    : undefined;

  await admin.from("zeroed_disputes").upsert(
    {
      stripe_dispute_id: dispute.id,
      stripe_charge_id: typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id,
      stripe_customer_id: customerId,
      user_id: userId,
      amount: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason,
      status: dispute.status,
      evidence_submitted: evidenceSubmitted,
      access_revoked: accessRevoked,
      due_by: dueBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_dispute_id" }
  );

  // Alert the owner(s).
  const { subject, html } = disputeAlertEmail({
    amount: formatAmount(dispute.amount, dispute.currency),
    currency: dispute.currency,
    reason: dispute.reason,
    customerEmail,
    dueBy,
    evidenceSubmitted,
    accessRevoked,
    stripeUrl: dashboardUrl(dispute.id),
    evidenceText,
  });
  await sendEmail({ to: ADMIN_EMAILS, subject, html, bypassSettingsCheck: true, emailType: "dispute_alert" });
}

// Dispute resolved (won/lost): record the outcome and notify the owner.
export async function handleDisputeClosed(admin: SupabaseClient, dispute: Stripe.Dispute) {
  await admin
    .from("zeroed_disputes")
    .update({ status: dispute.status, updated_at: new Date().toISOString() })
    .eq("stripe_dispute_id", dispute.id);
  const won = dispute.status === "won";
  await sendEmail({
    to: ADMIN_EMAILS,
    subject: `Dispute ${won ? "WON ✅" : `closed: ${dispute.status}`} — ${formatAmount(dispute.amount, dispute.currency)}`,
    html: `<p>Dispute <code>${dispute.id}</code> closed with status <strong>${dispute.status}</strong>.</p><p><a href="${dashboardUrl(dispute.id)}">View in Stripe</a></p>`,
    bypassSettingsCheck: true,
    emailType: "dispute_closed",
  });
}
