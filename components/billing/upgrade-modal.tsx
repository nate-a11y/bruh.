"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PLANS,
  PRICE_DISPLAY,
  ANNUAL_PRICE_DISPLAY,
  ANNUAL_PERIOD,
  ANNUAL_SAVINGS_DISPLAY,
  ANNUAL_MONTHLY_EQUIV,
} from "@/lib/plans";

type Interval = "monthly" | "annual";

interface UpgradeModalProps {
  /** Controlled open state. */
  open: boolean;
  /** Controlled open-state setter (Radix onOpenChange contract). */
  onOpenChange: (open: boolean) => void;
  /** Starts Stripe checkout for the chosen interval. Wire to useUpgrade().startCheckout. */
  onUpgrade: (interval?: Interval) => void;
  /** True while the checkout session is being created. */
  loading?: boolean;
  /**
   * Name of the Pro feature the user just hit, used to personalize the pitch
   * (e.g. "Plan my day"). Optional; falls back to a generic headline.
   */
  feature?: string;
}

/**
 * Reusable upgrade prompt. Self-contained shadcn Dialog rendered inline by the
 * triggering component (no global provider needed). Pitches Pro using the
 * marketing bullets from PLANS.pro, and its primary CTA starts the existing
 * personal Pro checkout flow via the onUpgrade handler.
 */
export function UpgradeModal({
  open,
  onOpenChange,
  onUpgrade,
  loading = false,
  feature,
}: UpgradeModalProps) {
  const title = feature ? `${feature} is a Pro feature` : "Unlock bruh. Pro";
  const [interval, setInterval] = useState<Interval>("monthly");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto mb-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <Crown className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
          </motion.div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-base">
            {PLANS.pro.tagline}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5 py-2">
          {PLANS.pro.features.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </span>
              <span className="text-foreground">{item}</span>
            </li>
          ))}
        </ul>

        {/* Monthly / Annual toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1">
          {(["monthly", "annual"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setInterval(opt)}
              className={cn(
                "rounded-md py-1.5 text-sm font-medium transition-colors",
                interval === opt
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt === "monthly" ? "Monthly" : "Annual"}
              {opt === "annual" && (
                <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {ANNUAL_SAVINGS_DISPLAY}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-baseline justify-center gap-1 py-1">
          <span className="text-2xl font-bold text-foreground">
            {interval === "annual" ? ANNUAL_PRICE_DISPLAY : PRICE_DISPLAY}
          </span>
          <span className="text-sm text-muted-foreground">
            {interval === "annual" ? ANNUAL_PERIOD : PLANS.pro.period}
          </span>
          <span className="ml-2 text-sm text-muted-foreground">
            {interval === "annual" ? ANNUAL_MONTHLY_EQUIV : "billed monthly"}
          </span>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => onUpgrade(interval)}
            disabled={loading}
            className="h-11 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Crown className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? "Starting checkout…" : "Upgrade to Pro"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full"
          >
            Maybe later
          </Button>
        </DialogFooter>

        <p className="text-center text-xs text-muted-foreground">
          Cancel anytime, no long-term commitment.
        </p>
      </DialogContent>
    </Dialog>
  );
}
