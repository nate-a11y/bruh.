"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock,
  Crown,
  Flame,
  Gauge,
  Loader2,
  Sparkles,
  Sunrise,
  Timer,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { useUpgrade } from "@/components/billing/use-upgrade";

// Brand palette. Recharts renders to SVG and does not read CSS variables, so
// theme values are inlined here to match the dark theme + brand orange.
const BRAND = "#FF6B00";
const MUTED = "rgb(136 136 136)";
const BORDER = "rgb(34 34 34)";
const CARD_BG = "rgb(20 20 20)";
const BAR_DIM = "rgba(255, 107, 0, 0.28)";

interface HourBucket {
  hour: number;
  minutes: number;
  sessions: number;
}

interface DayBucket {
  date: string;
  minutes: number;
  sessions: number;
}

interface InsightsResponse {
  windowDays: number;
  totals: {
    focusMinutes: number;
    sessionCount: number;
    avgSessionMinutes: number;
  };
  byHour: HourBucket[];
  bestHour: { hour: number | null; minutes: number };
  daily: DayBucket[];
  streaks: { current: number; longest: number };
}

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "locked" }
  | { status: "ready"; data: InsightsResponse };

// Render an hour-of-day (0-23) as a short label like "9a" / "2p".
function hourLabel(hour: number): string {
  const period = hour < 12 ? "a" : "p";
  const base = hour % 12 === 0 ? 12 : hour % 12;
  return `${base}${period}`;
}

// Turn total minutes into a compact "2h 15m" / "45m" string.
function formatDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function axisDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

function HourTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: HourBucket }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0]?.payload;
  if (!bucket) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{ background: CARD_BG, borderColor: BORDER }}
    >
      <p className="mb-1 font-medium text-foreground">{hourLabel(bucket.hour)}</p>
      <p className="text-muted-foreground">
        {formatDuration(bucket.minutes)} focus
      </p>
      <p className="text-muted-foreground">
        {bucket.sessions} {bucket.sessions === 1 ? "session" : "sessions"}
      </p>
    </div>
  );
}

function DayTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: DayBucket }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0]?.payload;
  if (!bucket) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{ background: CARD_BG, borderColor: BORDER }}
    >
      <p className="mb-1 font-medium text-foreground">
        {label ? axisDate(label) : ""}
      </p>
      <p className="text-muted-foreground">
        {formatDuration(bucket.minutes)} focus
      </p>
      <p className="text-muted-foreground">
        {bucket.sessions} {bucket.sessions === 1 ? "session" : "sessions"}
      </p>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}

function StatCard({ icon, label, value, hint }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            {icon}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * FocusInsights — Pro-only analytics over the user's own focus sessions.
 * Fetches /api/insights and renders headline stats, a best-focus-hours bar
 * chart, a daily focus-minutes trend, and streak/average detail. A 402 renders
 * an in-app Pro upsell that opens the existing UpgradeModal checkout flow.
 */
export function FocusInsights() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const upgrade = useUpgrade("focus_insights");

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch("/api/insights");
        if (res.status === 402) {
          if (active) setState({ status: "locked" });
          return;
        }
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as InsightsResponse;
        if (active) setState({ status: "ready", data: json });
      } catch {
        if (active) setState({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading your focus insights...
      </div>
    );
  }

  if (state.status === "locked") {
    return (
      <>
        <Card className="mx-auto max-w-lg border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <Crown className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">
                Focus Insights is a Pro feature
              </h2>
              <p className="text-sm text-muted-foreground">
                See your best focus hours, session trends, streaks, and totals.
                Turn your own data into a reason to keep locking in.
              </p>
            </div>
            <Button
              onClick={upgrade.openUpgrade}
              className="h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Unlock Focus Insights
            </Button>
          </CardContent>
        </Card>
        <UpgradeModal
          open={upgrade.open}
          onOpenChange={upgrade.setOpen}
          onUpgrade={upgrade.startCheckout}
          loading={upgrade.checkingOut}
          feature="Focus Insights"
        />
      </>
    );
  }

  if (state.status === "error") {
    return (
      <Card>
        <CardContent className="flex h-48 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-foreground">
            Could not load your insights.
          </p>
          <p className="text-sm text-muted-foreground">
            Give it a moment and refresh the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { data } = state;
  const { totals, byHour, bestHour, daily, streaks } = data;
  const hasData = totals.sessionCount > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <Timer className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">
              No focus sessions yet
            </p>
            <p className="text-sm text-muted-foreground">
              Run a focus session and your patterns will show up here.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <a href="/focus">
              <Timer className="h-4 w-4" aria-hidden="true" />
              Start focusing
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const bestHourValue =
    bestHour.hour === null ? "--" : hourLabel(bestHour.hour);
  const bestHourHint =
    bestHour.hour === null
      ? "Not enough data yet"
      : `${formatDuration(bestHour.minutes)} focused here`;

  return (
    <div className="space-y-6">
      {/* Headline stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Clock className="h-4 w-4" aria-hidden="true" />}
          label="Focus time"
          value={formatDuration(totals.focusMinutes)}
          hint={`Last ${data.windowDays} days`}
        />
        <StatCard
          icon={<Timer className="h-4 w-4" aria-hidden="true" />}
          label="Sessions"
          value={`${totals.sessionCount}`}
          hint={`Last ${data.windowDays} days`}
        />
        <StatCard
          icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
          label="Avg session"
          value={formatDuration(totals.avgSessionMinutes)}
          hint="Per focus session"
        />
        <StatCard
          icon={<Sunrise className="h-4 w-4" aria-hidden="true" />}
          label="Best hour"
          value={bestHourValue}
          hint={bestHourHint}
        />
      </div>

      {/* Best focus hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sunrise className="h-4 w-4 text-primary" aria-hidden="true" />
            Best focus hours
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Focus minutes by hour of day, last {data.windowDays} days. The
            brightest bar is when you lock in best.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={byHour}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis
                dataKey="hour"
                tickFormatter={(h: number) => hourLabel(h)}
                stroke={MUTED}
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: BORDER }}
                interval={2}
              />
              <YAxis
                stroke={MUTED}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={32}
              />
              <Tooltip
                content={<HourTooltip />}
                cursor={{ fill: "rgba(255, 107, 0, 0.08)" }}
              />
              <Bar dataKey="minutes" name="Focus minutes" radius={[3, 3, 0, 0]}>
                {byHour.map((bucket) => (
                  <Cell
                    key={bucket.hour}
                    fill={bucket.hour === bestHour.hour ? BRAND : BAR_DIM}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily focus-minutes trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            Daily focus trend
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Focus minutes per day over the last {data.windowDays} days.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={daily}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={axisDate}
                stroke={MUTED}
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: BORDER }}
                minTickGap={24}
              />
              <YAxis
                stroke={MUTED}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={32}
              />
              <Tooltip content={<DayTooltip />} cursor={{ stroke: BORDER }} />
              <Area
                type="monotone"
                dataKey="minutes"
                name="Focus minutes"
                stroke={BRAND}
                strokeWidth={2}
                fill="url(#focusFill)"
                dot={false}
                activeDot={{ r: 4, fill: BRAND }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Streaks + averages */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Flame className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {streaks.current} {streaks.current === 1 ? "day" : "days"}
              </p>
              <p className="text-sm text-muted-foreground">
                Current focus streak
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <TrendingUp className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {streaks.longest} {streaks.longest === 1 ? "day" : "days"}
              </p>
              <p className="text-sm text-muted-foreground">
                Longest focus streak
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
