"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  UserMinus,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DunningRow {
  user_id: string;
  status: string;
  past_due_since: string | null;
  current_period_end: string | null;
  user_email: string;
  display_name: string | null;
}

interface DisputeRow {
  id: string;
  amount: number | null;
  currency: string | null;
  reason: string | null;
  status: string | null;
  evidence_submitted: boolean;
  access_revoked: boolean;
  created_at: string;
}

interface Metrics {
  mrr: { cents: number; dollars: number; personalCents: number; teamCents: number };
  subscriptions: {
    active: number;
    trialing: number;
    pastDue: number;
    canceled: number;
    freeForever: number;
    trialExpired: number;
  };
  teams: { active: number; trialing: number };
  users: { total: number; signupsThisWeek: number; signupsThisMonth: number; active7d: number };
  churn: { canceledLast30: number };
  dunning: { pastDueCount: number; recent: DunningRow[] };
  disputes: {
    total: number;
    open: number;
    byStatus: Record<string, number>;
    disputedAmountCents: number;
    currency: string;
    recent: DisputeRow[];
  };
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
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-400"
      : tone === "warning"
      ? "text-amber-400"
      : tone === "success"
      ? "text-emerald-400"
      : "text-primary";
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

export function MetricsOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/metrics");
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as Metrics;
        if (active) setMetrics(data);
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
        <Loader2 className="h-4 w-4 animate-spin" /> Loading business metrics...
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Could not load business metrics.
        </CardContent>
      </Card>
    );
  }

  const { mrr, subscriptions, users, churn, dunning, disputes } = metrics;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="MRR"
          value={money(mrr.cents)}
          sub={`${money(mrr.personalCents)} personal + ${money(mrr.teamCents)} teams`}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          title="Active subscriptions"
          value={String(subscriptions.active)}
          sub={`${subscriptions.trialing} on trial`}
          icon={TrendingUp}
        />
        <StatCard
          title="New signups"
          value={String(users.signupsThisWeek)}
          sub={`${users.signupsThisMonth} this month / ${users.total} total`}
          icon={UserMinus}
        />
        <StatCard
          title="Active users (7d)"
          value={String(users.active7d)}
          sub="created a task in the last week"
          icon={TrendingUp}
        />
        <StatCard
          title="Past due"
          value={String(dunning.pastDueCount)}
          sub="in dunning recovery"
          icon={Clock}
          tone={dunning.pastDueCount > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Churn (30d)"
          value={String(churn.canceledLast30)}
          sub="canceled in last 30 days"
          icon={UserMinus}
          tone={churn.canceledLast30 > 0 ? "warning" : "default"}
        />
      </div>

      {(disputes.total > 0 || dunning.recent.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Past due ({dunning.pastDueCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dunning.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">None. All payments current.</p>
              ) : (
                dunning.recent.map((d) => (
                  <div key={d.user_id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{d.display_name || d.user_email}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.past_due_since ? format(new Date(d.past_due_since), "MMM d") : ""}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                Disputes ({disputes.open} open)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {disputes.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No disputes. Nice.</p>
              ) : (
                disputes.recent.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {d.amount ? money(d.amount, d.currency || "usd") : ""}
                      <span className="text-xs text-muted-foreground">{d.reason}</span>
                    </span>
                    <Badge variant={d.status === "won" ? "default" : "secondary"}>
                      {d.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
