import { createClient } from '@/lib/supabase/server';
import type { SubscriptionAccess, CouponRedemptionResult, Subscription } from '@/lib/supabase/types';

const PRICE_MONTHLY = 1999; // $19.99 in cents
const TRIAL_DAYS = 30;

export const SUBSCRIPTION_CONFIG = {
  priceMonthly: PRICE_MONTHLY,
  priceDisplay: '$19.99',
  trialDays: TRIAL_DAYS,
  stripePriceId: process.env.STRIPE_PRICE_ID,
};

/**
 * Check if a user has access to the app (trial, active subscription, or free forever)
 */
export async function checkSubscriptionAccess(userId: string): Promise<SubscriptionAccess> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .rpc('zeroed_check_subscription_access', { p_user_id: userId })
    .single();

  if (error) {
    console.error('Error checking subscription:', error);
    // Default to allowing access on error (fail open for better UX)
    return { has_access: true, status: 'trialing', days_remaining: 30 };
  }

  return data as SubscriptionAccess;
}

/**
 * Get the full subscription record for a user
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('zeroed_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting subscription:', error);
  }

  return data as Subscription | null;
}

/**
 * Redeem a coupon code for a user
 */
export async function redeemCoupon(userId: string, code: string): Promise<CouponRedemptionResult> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .rpc('zeroed_redeem_coupon', { p_user_id: userId, p_code: code })
    .single();

  if (error) {
    console.error('Error redeeming coupon:', error);
    return { success: false, message: 'Failed to redeem coupon', new_status: null };
  }

  return data as CouponRedemptionResult;
}

/**
 * Validate a coupon code (without redeeming)
 */
export async function validateCoupon(code: string): Promise<{ valid: boolean; type?: string }> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('zeroed_coupons')
    .select('code, coupon_type, is_active, expires_at, max_uses, current_uses')
    .ilike('code', code)
    .single();

  if (error || !data) {
    return { valid: false };
  }

  const isValid =
    data.is_active &&
    (!data.expires_at || new Date(data.expires_at) > new Date()) &&
    (data.max_uses === null || data.current_uses < data.max_uses);

  return { valid: isValid, type: isValid ? data.coupon_type : undefined };
}

/**
 * Check if user needs to see upgrade prompt
 */
export function shouldShowUpgradePrompt(access: SubscriptionAccess): boolean {
  // Show upgrade prompt if trial is ending soon (7 days or less) or expired
  if (access.status === 'trialing' && access.days_remaining !== null && access.days_remaining <= 7) {
    return true;
  }
  if (access.status === 'trial_expired' || access.status === 'canceled') {
    return true;
  }
  return false;
}

/**
 * Get user-friendly status message
 */
export function getStatusMessage(access: SubscriptionAccess): string {
  switch (access.status) {
    case 'free_forever':
      return 'Lifetime access';
    case 'active':
      return 'Pro subscription';
    case 'trialing':
      if (access.days_remaining === 1) return '1 day left in trial';
      return `${access.days_remaining} days left in trial`;
    case 'past_due':
      return 'Payment past due';
    case 'canceled':
      return 'Subscription canceled';
    case 'trial_expired':
      return 'Trial expired';
    default:
      return 'Unknown status';
  }
}
