"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Gift,
  Users,
  CheckCircle2,
  DollarSign,
  Trophy,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TopReferrer {
  user_id: string;
  email: string;
  display_name: string | null;
  total: number;
  converted: number;
}

interface RecentReferral {
  id: string;
  referrer_email: string;
  referrer_display_name: string | null;
  referred_email: string;
  code: string;
  status: string;
  reward_granted: boolean;
  created_at: string;
}

interface ReferralData {
  totals: {
    total: number;
    converted: number;
    rewardsGranted: number;
    rewardValueCents: number;
    rewardPerReferralCents: number;
  };
  topReferrers: TopReferrer[];
  recent: RecentReferral[];
}

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success";
}) {
  const toneClass = tone === "success" ? "text-emerald-400" : "text-primary";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <Icon className={`h-4 w-4 ${toneClass}`} />
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ReferralPanel() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/referrals");
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as ReferralData;
        if (active) setData(json);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading referral activity...
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Could not load referral activity.
        </CardContent>
      </Card>
    );
  }

  const { totals, topReferrers, recent } = data;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total invited"
          value={String(totals.total)}
          sub="referrals recorded"
          icon={Users}
        />
        <StatCard
          title="Converted"
          value={String(totals.converted)}
          sub={`${totals.total > 0 ? Math.round((totals.converted / totals.total) * 100) : 0}% conversion`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          title="Free months granted"
          value={String(totals.rewardsGranted)}
          sub={`${money(totals.rewardPerReferralCents)} each`}
          icon={Gift}
        />
        <StatCard
          title="Reward value"
          value={money(totals.rewardValueCents)}
          sub="credited to referrers"
          icon={DollarSign}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" />
              Top referrers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topReferrers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No referrers yet.</p>
            ) : (
              topReferrers.map((r) => (
                <div
                  key={r.user_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">{r.display_name || r.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.converted} converted / {r.total} invited
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-4 w-4 text-primary" />
              Recent referrals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No referrals yet.</p>
            ) : (
              recent.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">
                      {r.referrer_display_name || r.referrer_email}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      invited {r.referred_email}
                    </span>
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d")}
                    </span>
                    <Badge
                      variant={r.status === "converted" ? "default" : "secondary"}
                    >
                      {r.status}
                    </Badge>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
