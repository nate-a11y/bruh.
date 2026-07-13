"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Crown, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { useUpgrade } from "@/components/billing/use-upgrade";

interface CoachReply {
  message: string;
  suggestion: string;
}

/**
 * AI accountability coach card for /today. Fetches a gentle, ADHD-aware
 * check-in from the Pro-gated /api/coach route. On a 402 it collapses into a
 * compact Pro upsell that opens the in-app upgrade modal.
 */
export function CoachCard() {
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState<CoachReply | null>(null);
  const [gated, setGated] = useState(false);
  const upgrade = useUpgrade("coach");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach");

      if (res.status === 402) {
        setGated(true);
        setReply(null);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Coach is taking a breather");

      setGated(false);
      setReply({ message: data.message, suggestion: data.suggestion });
    } catch {
      setReply({
        message: "Couldn't reach your coach right now. That's on us, not you.",
        suggestion: "Give it another try in a moment.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function refresh() {
    trackEvent("feature_used", { feature: "coach_refresh" });
    load();
  }

  // Pro upsell: compact card that opens the upgrade modal.
  if (gated) {
    return (
      <>
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Meet your accountability coach
                </div>
                <p className="text-sm text-muted-foreground">
                  A warm, ADHD-aware check-in on what&apos;s on your plate. Pro only.
                </p>
              </div>
            </div>
            <Button onClick={upgrade.openUpgrade} className="gap-2 sm:shrink-0">
              <Crown className="h-4 w-4" aria-hidden="true" />
              Unlock with Pro
            </Button>
          </CardContent>
        </Card>
        <UpgradeModal
          open={upgrade.open}
          onOpenChange={upgrade.setOpen}
          onUpgrade={upgrade.startCheckout}
          loading={upgrade.checkingOut}
          feature="Accountability coach"
        />
      </>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="text-xs font-medium uppercase tracking-wide text-primary">
              Your coach
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            aria-label="Get a fresh check-in"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </div>

        {loading && !reply ? (
          <div className="mt-3 space-y-2" aria-hidden="true">
            <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-9 w-full animate-pulse rounded-lg bg-muted/60" />
          </div>
        ) : (
          reply && (
            <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {reply.message}
              </p>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                <ArrowRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">Try this: </span>
                  {reply.suggestion}
                </span>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
