"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Play, RotateCcw, X, CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { useUpgrade } from "@/components/billing/use-upgrade";

interface NextAction {
  taskId: string;
  title: string;
  firstStep: string;
  minutes: number;
  reason: string;
}

export function WhatsNext() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<NextAction | null>(null);
  const upgrade = useUpgrade("whats_next");

  async function pick() {
    setLoading(true);
    trackEvent("feature_used", { feature: "whats_next" });
    try {
      const res = await fetch("/api/tasks/next-action");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (!data.next) {
        toast("Nothing pending. Go touch grass. 🌱");
        setAction(null);
      } else {
        setAction(data.next);
      }
    } catch {
      toast.error("Couldn't pick a task. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!action) {
    return (
      <Button onClick={pick} disabled={loading} variant="outline" className="gap-2">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {loading ? "Thinking…" : "I'm stuck — what now?"}
      </Button>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-primary">
              Do this next
            </div>
            <div className="text-lg font-semibold text-foreground">{action.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{action.reason}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Dismiss suggestion"
            onClick={() => setAction(null)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <span className="font-medium text-foreground">First step: </span>
          <span className="text-muted-foreground">{action.firstStep}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push("/focus")} className="gap-2">
            <Play className="h-4 w-4" aria-hidden="true" />
            Focus {action.minutes} min
          </Button>
          <Button onClick={pick} variant="ghost" size="sm" className="gap-1" disabled={loading}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Not this
          </Button>
        </div>
        <button
          type="button"
          onClick={upgrade.openUpgrade}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          Tired of picking one at a time? Let Pro plan your whole day.
        </button>
      </CardContent>
      <UpgradeModal
        open={upgrade.open}
        onOpenChange={upgrade.setOpen}
        onUpgrade={upgrade.startCheckout}
        loading={upgrade.checkingOut}
        feature="Plan my day"
      />
    </Card>
  );
}
