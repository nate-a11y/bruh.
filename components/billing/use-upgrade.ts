"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

/**
 * Drives the in-app upgrade flow: modal open state + the Stripe checkout
 * redirect. Reuses the existing personal Pro checkout route
 * (POST /api/stripe/checkout) so we never invent a second checkout path.
 *
 *   const upgrade = useUpgrade("plan_my_day");
 *   // on a 402 from a Pro feature:
 *   upgrade.openUpgrade();
 *   // render inline:
 *   <UpgradeModal
 *     open={upgrade.open}
 *     onOpenChange={upgrade.setOpen}
 *     onUpgrade={upgrade.startCheckout}
 *     loading={upgrade.checkingOut}
 *   />
 *
 * `source` is a short label for the feature that triggered the prompt; it is
 * attached to analytics so we can see which gates convert.
 */
export function useUpgrade(source?: string) {
  const [open, setOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const openUpgrade = useCallback(() => {
    trackEvent("upgrade_prompt_shown", { source: source ?? "unknown" });
    setOpen(true);
  }, [source]);

  const startCheckout = useCallback(async () => {
    setCheckingOut(true);
    trackEvent("checkout_started", { plan: "pro", source: source ?? "upgrade_modal" });
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      toast.error("Failed to start checkout");
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setCheckingOut(false);
    }
  }, [source]);

  return { open, setOpen, openUpgrade, startCheckout, checkingOut };
}
