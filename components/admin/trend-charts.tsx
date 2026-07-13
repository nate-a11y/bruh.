"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Brand palette. Recharts renders to SVG and does not read CSS variables, so
// theme values are inlined here to match the dark theme + brand orange.
const BRAND = "#FF6B00";
const MUTED = "rgb(136 136 136)";
const BORDER = "rgb(34 34 34)";
const CARD_BG = "rgb(20 20 20)";

interface TrendBucket {
  date: string;
  signups: number;
  newSubscriptions: number;
  cumulativeUsers: number;
}

interface TrendsResponse {
  days: number;
  trends: TrendBucket[];
}

const RANGE_OPTIONS = [7, 30, 90] as const;

function axisDate(value: string) {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{ background: CARD_BG, borderColor: BORDER }}
    >
      <p className="mb-1 font-medium text-foreground">
        {label ? axisDate(label) : ""}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color || BRAND }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto font-medium text-foreground">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendCharts() {
  const [data, setData] = useState<TrendBucket[] | null>(null);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await fetch(`/api/admin/metrics/trends?days=${days}`);
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as TrendsResponse;
        if (active) setData(json.trends || []);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [days]);

  const hasData = !!data && data.length > 0;
  const hasSignups = hasData && data!.some((d) => d.signups > 0);
  const hasSubs = hasData && data!.some((d) => d.newSubscriptions > 0);

  const rangePicker = (
    <div className="flex items-center gap-1">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setDays(opt)}
          className={`rounded-md px-2 py-1 text-xs transition-colors ${
            days === opt
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {opt}d
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily signups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Daily signups
            </CardTitle>
            {rangePicker}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : error || !hasData ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                {error ? "Could not load trends." : "No signups in this window."}
              </div>
            ) : !hasSignups ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                No signups in this window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={data!}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
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
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: BORDER }} />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    name="Signups"
                    stroke={BRAND}
                    strokeWidth={2}
                    fill="url(#signupsFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: BRAND }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cumulative users + new subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Cumulative users
            </CardTitle>
            {rangePicker}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : error || !hasData ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                {error ? "Could not load trends." : "No data in this window."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={data!}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
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
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: BORDER }} />
                  <Line
                    type="monotone"
                    dataKey="cumulativeUsers"
                    name="Total users"
                    stroke={BRAND}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: BRAND }}
                  />
                  {hasSubs ? (
                    <Line
                      type="monotone"
                      dataKey="newSubscriptions"
                      name="New subscriptions"
                      stroke={MUTED}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={{ r: 4, fill: MUTED }}
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        Signups and cumulative users are derived from account creation dates. New
        subscriptions count subscription records created per day.
      </p>
    </div>
  );
}
