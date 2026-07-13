import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireProApi } from "@/lib/subscriptions";

// GET /api/insights
//
// Focus Insights: a Pro-only analytics view over the CURRENT user's own focus
// sessions. Pro-gated (requireProApi returns 401/402) and READ-ONLY: this route
// never writes or mutates any row. Every aggregate below is computed in memory
// from the raw rows so we make a single scoped query and shape the rest here.
//
// Window: the trailing 30 days of completed focus sessions (session_type
// 'focus' only; breaks are excluded from focus analytics). Streaks look back a
// little further so a streak that began before the window is still counted.

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;
// Pull a wider slice than the window so streaks spanning the window edge are
// accurate. 120 days is plenty for a "current streak" calculation.
const LOOKBACK_DAYS = 120;

interface FocusSessionRow {
  duration_minutes: number;
  started_at: string | null;
  created_at: string;
  completed: boolean;
  session_type: "focus" | "short_break" | "long_break";
}

interface HourBucket {
  hour: number; // 0-23, bucketed by UTC (see dayKey note below)
  minutes: number;
  sessions: number;
}

interface DayBucket {
  date: string; // yyyy-mm-dd
  minutes: number;
  sessions: number;
}

// Format a Date as a yyyy-mm-dd key in UTC. Sessions are stored as timestamptz;
// we bucket by UTC calendar day so the API is deterministic regardless of where
// it runs. Good enough for trend/streak shapes at day granularity.
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  // Focus Insights is a Pro feature. Gate server-side, fail closed.
  const gate = await requireProApi();
  if ("response" in gate) return gate.response;
  const { user } = gate;

  const supabase = await createClient();

  const now = Date.now();
  const lookbackStart = new Date(now - LOOKBACK_DAYS * DAY_MS);
  const windowStart = new Date(now - WINDOW_DAYS * DAY_MS);

  // Only this user's rows. RLS already scopes to the user, and we filter by
  // user_id explicitly for defense in depth. Prefer started_at, but keep
  // created_at as a fallback for rows where started_at is null.
  const { data, error } = await supabase
    .from("zeroed_focus_sessions")
    .select("duration_minutes, started_at, created_at, completed, session_type")
    .eq("user_id", user.id)
    .eq("session_type", "focus")
    .eq("completed", true)
    .gte("created_at", lookbackStart.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading focus insights:", error);
    return NextResponse.json({ error: "Could not load insights." }, { status: 500 });
  }

  const rows = (data || []) as FocusSessionRow[];

  // Effective timestamp for a row: started_at when present, else created_at.
  const withTime = rows.map((r) => ({
    minutes: Math.max(0, r.duration_minutes || 0),
    at: new Date(r.started_at || r.created_at),
  }));

  // ------------------------------------------------------------------
  // Totals (last 30 days).
  // ------------------------------------------------------------------
  const windowRows = withTime.filter((r) => r.at.getTime() >= windowStart.getTime());
  const totalMinutes = windowRows.reduce((sum, r) => sum + r.minutes, 0);
  const sessionCount = windowRows.length;
  const avgSessionMinutes =
    sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;

  // ------------------------------------------------------------------
  // Focus minutes by hour of day (last 30 days) — reveals best focus hours.
  // 24 fixed buckets so the chart always has a full day on the x-axis.
  // ------------------------------------------------------------------
  const hourBuckets: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    minutes: 0,
    sessions: 0,
  }));
  for (const r of windowRows) {
    const hour = r.at.getUTCHours();
    hourBuckets[hour].minutes += r.minutes;
    hourBuckets[hour].sessions += 1;
  }

  // Best hour = the bucket with the most focus minutes (null when no data).
  let bestHour: number | null = null;
  let bestHourMinutes = 0;
  for (const b of hourBuckets) {
    if (b.minutes > bestHourMinutes) {
      bestHourMinutes = b.minutes;
      bestHour = b.hour;
    }
  }

  // ------------------------------------------------------------------
  // Daily trend (last 30 days). Fill every day so the line/area is continuous,
  // even on days with zero sessions.
  // ------------------------------------------------------------------
  const dayMap = new Map<string, DayBucket>();
  for (let i = WINDOW_DAYS - 1; i >= 0; i -= 1) {
    const key = dayKey(new Date(now - i * DAY_MS));
    dayMap.set(key, { date: key, minutes: 0, sessions: 0 });
  }
  for (const r of windowRows) {
    const key = dayKey(r.at);
    const bucket = dayMap.get(key);
    if (bucket) {
      bucket.minutes += r.minutes;
      bucket.sessions += 1;
    }
  }
  const daily: DayBucket[] = Array.from(dayMap.values());

  // ------------------------------------------------------------------
  // Streaks: consecutive calendar days (UTC) that have at least one focus
  // session. Uses the full lookback slice, not just the 30-day window.
  //   - currentStreak: run ending today (or yesterday, so a not-yet-active
  //     today does not break a streak mid-day).
  //   - longestStreak: longest run anywhere in the lookback slice.
  // ------------------------------------------------------------------
  const activeDays = new Set<string>();
  for (const r of withTime) {
    activeDays.add(dayKey(r.at));
  }

  let longestStreak = 0;
  let currentStreak = 0;

  if (activeDays.size > 0) {
    // Longest run: walk sorted day keys, counting consecutive calendar days.
    const sorted = Array.from(activeDays).sort();
    let run = 0;
    let prev: string | null = null;
    for (const key of sorted) {
      if (prev === null) {
        run = 1;
      } else {
        const prevMs = Date.parse(`${prev}T00:00:00Z`);
        const curMs = Date.parse(`${key}T00:00:00Z`);
        run = curMs - prevMs === DAY_MS ? run + 1 : 1;
      }
      if (run > longestStreak) longestStreak = run;
      prev = key;
    }

    // Current run: step back day by day from today while each day is active.
    // Allow the streak to "start" at yesterday if today has no session yet.
    const todayKey = dayKey(new Date(now));
    const yesterdayKey = dayKey(new Date(now - DAY_MS));
    let cursor: Date | null;
    if (activeDays.has(todayKey)) {
      cursor = new Date(now);
    } else if (activeDays.has(yesterdayKey)) {
      cursor = new Date(now - DAY_MS);
    } else {
      cursor = null;
    }
    while (cursor && activeDays.has(dayKey(cursor))) {
      currentStreak += 1;
      cursor = new Date(cursor.getTime() - DAY_MS);
    }
  }

  return NextResponse.json({
    windowDays: WINDOW_DAYS,
    totals: {
      focusMinutes: totalMinutes,
      sessionCount,
      avgSessionMinutes,
    },
    byHour: hourBuckets,
    bestHour: {
      hour: bestHour,
      minutes: bestHourMinutes,
    },
    daily,
    streaks: {
      current: currentStreak,
      longest: longestStreak,
    },
  });
}
