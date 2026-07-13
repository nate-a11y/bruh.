"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { useUpgrade } from "@/components/billing/use-upgrade";

/**
 * AI "plan my day" ritual: one tap arranges today's unscheduled tasks into time
 * blocks via the auto-schedule endpoint. Pro feature — handles the 402 by
 * opening the in-app upgrade modal instead of failing silently.
 */
export function PlanMyDay({ taskIds }: { taskIds: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const upgrade = useUpgrade("plan_my_day");

  if (taskIds.length === 0) return null;

  async function plan() {
    setLoading(true);
    trackEvent("feature_used", { feature: "plan_my_day" });
    try {
      const res = await fetch("/api/tasks/auto-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });
      const data = await res.json();

      if (res.status === 402) {
        upgrade.openUpgrade();
        return;
      }
      if (!res.ok) throw new Error(data.error || "Couldn't plan your day");

      toast.success("Your day is planned. Lock in. 🔒");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={plan} disabled={loading} variant="outline" className="gap-2">
        <CalendarClock className="h-4 w-4" aria-hidden="true" />
        {loading ? "Planning…" : "Plan my day"}
      </Button>
      <UpgradeModal
        open={upgrade.open}
        onOpenChange={upgrade.setOpen}
        onUpgrade={upgrade.startCheckout}
        loading={upgrade.checkingOut}
        feature="Plan my day"
      />
    </>
  );
}
