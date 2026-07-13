"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import type { SubscriptionStatus } from "@/lib/supabase/types";

interface TrialBannerProps {
  status: SubscriptionStatus;
  daysRemaining: number | null;
}

// Slim, dismissible trial banner. Only renders for users mid-trial ('trialing');
// 'active', 'free_forever' and every other status render nothing. Dismissal is
// per-session (component state) so it comes back on the next visit, keeping the
// upgrade nudge gently present without nagging within a single session.
export function TrialBanner({ status, daysRemaining }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (status !== "trialing" || dismissed) return null;

  const days = daysRemaining ?? 0;
  const dayLabel =
    days <= 0
      ? "Your trial ends today"
      : `${days} ${days === 1 ? "day" : "days"} left in your trial`;

  return (
    <div className="flex items-center gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2 text-sm md:px-6">
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 truncate text-foreground">
        <span className="font-semibold text-primary">{dayLabel}.</span>{" "}
        <span className="text-muted-foreground">
          Keep AI planning and integrations after it ends.
        </span>
      </p>
      <Link
        href="/pricing"
        className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-bruh-orange-hover"
      >
        Upgrade
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss trial banner"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
