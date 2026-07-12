"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { teamMonthlyCents, TEAM_SEAT_DISPLAY, PRICE_DISPLAY } from "@/lib/plans";

interface TeamBillingProps {
  teamId: string;
  isOwner: boolean;
  subscriptionStatus: string;
  memberCount: number;
}

export function TeamBilling({
  teamId,
  isOwner,
  subscriptionStatus,
  memberCount,
}: TeamBillingProps) {
  const [loading, setLoading] = useState(false);
  const active = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const monthly = (teamMonthlyCents(memberCount) / 100).toFixed(2);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/team-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open billing");
      setLoading(false);
    }
  }

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {active
              ? "This team is on the Team plan — you get Pro on us."
              : "No active plan yet. Ask the team owner to subscribe."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {PRICE_DISPLAY} base + {TEAM_SEAT_DISPLAY}/mo per additional member. Everyone
          on the team gets Pro.
        </p>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <div className="text-2xl font-bold text-foreground">
              ${monthly}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {memberCount} member{memberCount === 1 ? "" : "s"} ·{" "}
              {active ? `status: ${subscriptionStatus}` : "not subscribed"}
            </div>
          </div>
          <Button onClick={handleClick} disabled={loading}>
            {loading ? "…" : active ? "Manage billing" : "Subscribe"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
