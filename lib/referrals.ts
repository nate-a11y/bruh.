import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

// One-month account credit the referrer earns when a referral converts to paid.
export const REFERRAL_REWARD_CENTS = 1999;

// Unambiguous alphabet (no 0/O/1/I) for a short, shareable code.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(len = 7): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Return the user's stable referral code, creating and persisting one on first
// use. Retries a couple of times on the (astronomically unlikely) unique clash.
export async function getOrCreateReferralCode(
  admin: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: existing } = await admin
    .from("zeroed_user_preferences")
    .select("referral_code")
    .eq("user_id", userId)
    .maybeSingle();
  const current = (existing as any)?.referral_code as string | null | undefined;
  if (current) return current;

  // Upsert (not update) so a user who has no preferences row yet still gets a
  // persisted code. onConflict user_id sets the code on the existing row.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generateCode();
    const { error } = await admin
      .from("zeroed_user_preferences")
      .upsert({ user_id: userId, referral_code: code }, { onConflict: "user_id" });
    if (!error) return code;
  }
  // Fall back to a longer code if generation kept clashing.
  const code = generateCode(10);
  await admin
    .from("zeroed_user_preferences")
    .upsert({ user_id: userId, referral_code: code }, { onConflict: "user_id" });
  return code;
}

// Record that `referredUserId` was referred by the owner of `code`. No-op if the
// code is unknown, is the referred user's own code, or the user was already
// referred (one referrer per referred person).
export async function recordReferral(
  admin: SupabaseClient,
  args: { code: string; referredUserId: string }
): Promise<{ recorded: boolean; reason?: string }> {
  const code = args.code.trim().toUpperCase();
  if (!code) return { recorded: false, reason: "empty_code" };

  const { data: referrer } = await admin
    .from("zeroed_user_preferences")
    .select("user_id")
    .eq("referral_code", code)
    .maybeSingle();
  const referrerUserId = (referrer as any)?.user_id as string | undefined;
  if (!referrerUserId) return { recorded: false, reason: "unknown_code" };
  if (referrerUserId === args.referredUserId) return { recorded: false, reason: "self" };

  const { error } = await admin.from("zeroed_referrals").insert({
    referrer_user_id: referrerUserId,
    referred_user_id: args.referredUserId,
    code,
  });
  // Unique violation on referred_user_id means they were already referred.
  if (error) return { recorded: false, reason: "already_referred" };
  return { recorded: true };
}

// Ensure a user has a Stripe customer id, creating one if needed so we have
// somewhere to hold the referral credit even before they subscribe.
async function ensureStripeCustomer(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: sub } = await admin
    .from("zeroed_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  const existing = (sub as any)?.stripe_customer_id as string | null | undefined;
  if (existing) return existing;
  if (!stripe) return null;

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser.user?.email;
  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { supabase_user_id: userId, source: "referral_reward" },
  });
  await admin
    .from("zeroed_subscriptions")
    .upsert(
      { user_id: userId, stripe_customer_id: customer.id, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  return customer.id;
}

// Called when a referred user converts to a paid subscription. Marks the
// referral converted and credits the referrer one free month. Idempotent: the
// reward is granted at most once per referral.
export async function grantReferralRewardOnConversion(
  admin: SupabaseClient,
  referredUserId: string
): Promise<void> {
  const { data: referral } = await admin
    .from("zeroed_referrals")
    .select("id, referrer_user_id, reward_granted")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();
  if (!referral || (referral as any).reward_granted) return;

  const now = new Date().toISOString();
  await admin
    .from("zeroed_referrals")
    .update({ status: "converted", converted_at: now })
    .eq("id", (referral as any).id);

  try {
    const customerId = await ensureStripeCustomer(admin, (referral as any).referrer_user_id);
    if (customerId && stripe) {
      // Negative amount = credit applied to the customer's next invoice.
      await stripe.customers.createBalanceTransaction(customerId, {
        amount: -REFERRAL_REWARD_CENTS,
        currency: "usd",
        description: "Referral reward: one free month",
      });
    }
    await admin
      .from("zeroed_referrals")
      .update({ reward_granted: true, rewarded_at: now })
      .eq("id", (referral as any).id);
  } catch (err) {
    console.error("Failed to grant referral reward:", err);
  }
}
