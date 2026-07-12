import type { SubscriptionAccess, SubscriptionStatus } from "@/lib/supabase/types";

/**
 * Central plan / tier configuration.
 *
 * bruh. is freemium: the core app is free forever. Pro ($19.99/mo, with a 30-day
 * trial) unlocks the features flagged below. To change the free/Pro line, edit
 * ENFORCED_PRO_FEATURES and the marketing lists here — nothing else.
 */

// Subscription statuses that grant Pro-level access. `has_access` from the DB
// already encodes trial-not-expired / active / free_forever / past_due(grace).
const PRO_STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "free_forever",
  "past_due",
];

export function isProStatus(status: SubscriptionStatus): boolean {
  return PRO_STATUSES.includes(status);
}

/** Does this access snapshot grant Pro features? */
export function isPro(
  access: Pick<SubscriptionAccess, "has_access" | "status"> | null | undefined
): boolean {
  if (!access) return false;
  return access.has_access === true && isProStatus(access.status);
}

/**
 * Server-enforced Pro features. These are gated in API routes/server actions.
 * Brain Dump and Focus mode are intentionally FREE (the hook) for now.
 */
export const ENFORCED_PRO_FEATURES = {
  aiPlanning: true, // auto-schedule / AI "plan my day"
  integrations: true, // Google Calendar, Notion, Slack
} as const;

export type ProFeature = keyof typeof ENFORCED_PRO_FEATURES;

export const PRICE_DISPLAY = "$19.99";
export const TRIAL_DAYS = 30;

/** Marketing plan content for /pricing and upgrade prompts. */
export const PLANS = {
  free: {
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Get your shit together. No card required.",
    features: [
      "Unlimited tasks, lists & projects",
      "AI Brain Dump",
      "Focus mode + Pomodoro timer",
      "Recurring tasks",
      "Stats & streaks",
      "Works offline (PWA)",
    ],
  },
  pro: {
    name: "Pro",
    price: PRICE_DISPLAY,
    period: "/mo",
    tagline: `Everything, unlocked. Starts with a ${TRIAL_DAYS}-day free trial.`,
    features: [
      "Everything in Free",
      "AI planning: auto-schedule your day",
      "Google Calendar 2-way sync",
      "Notion & Slack integrations",
      "Priority support",
    ],
  },
} as const;
