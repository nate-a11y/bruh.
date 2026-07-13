import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// GET /api/admin/metrics/trends?days=30
//
// Owner growth-over-time trends. Admin-gated (isAdmin on the authenticated
// user) and backed by the service-role client. Every query here is READ-ONLY:
// this route never writes or mutates any row.
//
// Returns daily buckets across the requested window:
//   [{ date, signups, newSubscriptions, cumulativeUsers }]
// where:
//   - signups: users whose created_at falls on that day
//   - newSubscriptions: zeroed_subscriptions rows created on that day
//   - cumulativeUsers: running total of all users up to and including that day
//
// Efficiency: one full listUsers walk (paginated) plus a single subscriptions
// query. All bucketing happens in memory.

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

interface TrendBucket {
  date: string;
  signups: number;
  newSubscriptions: number;
  cumulativeUsers: number;
}

// YYYY-MM-DD in UTC for an ISO timestamp (or Date).
function dayKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse + clamp the window.
    const raw = Number(request.nextUrl.searchParams.get("days"));
    const days = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), MAX_DAYS) : DEFAULT_DAYS;

    const admin = createServiceClient();

    const now = Date.now();
    // Window start is the beginning (UTC midnight) of the earliest day shown.
    const windowStart = new Date(now - (days - 1) * DAY_MS);
    windowStart.setUTCHours(0, 0, 0, 0);
    const windowStartMs = windowStart.getTime();

    // Pre-seed an ordered map of every day in the window so gaps render as 0.
    const buckets = new Map<string, TrendBucket>();
    for (let i = 0; i < days; i += 1) {
      const key = dayKey(new Date(windowStartMs + i * DAY_MS));
      buckets.set(key, { date: key, signups: 0, newSubscriptions: 0, cumulativeUsers: 0 });
    }

    // ------------------------------------------------------------------
    // Users. auth.admin.listUsers is paginated; walk pages until exhausted.
    // We need every user (not just in-window) so cumulativeUsers reflects the
    // true running total, including everyone who signed up before the window.
    // ------------------------------------------------------------------
    let usersBeforeWindow = 0;
    let page = 1;
    const perPage = 200;
    // Cap pages defensively so a runaway loop can't hang the request.
    for (let guard = 0; guard < 100; guard += 1) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (listErr) break;
      const batch = list?.users || [];
      for (const u of batch) {
        const created = u.created_at;
        if (!created) continue;
        const createdMs = new Date(created).getTime();
        if (createdMs < windowStartMs) {
          usersBeforeWindow += 1;
          continue;
        }
        const bucket = buckets.get(dayKey(created));
        if (bucket) bucket.signups += 1;
      }
      if (batch.length < perPage) break;
      page += 1;
    }

    // ------------------------------------------------------------------
    // New subscriptions. Single query scoped to the window; bucket by day.
    // ------------------------------------------------------------------
    const { data: subs } = (await (admin as any)
      .from("zeroed_subscriptions")
      .select("created_at, status")
      .gte("created_at", windowStart.toISOString())) as {
      data: Array<{ created_at: string | null; status: string | null }> | null;
    };

    for (const s of subs || []) {
      if (!s.created_at) continue;
      const bucket = buckets.get(dayKey(s.created_at));
      if (bucket) bucket.newSubscriptions += 1;
    }

    // ------------------------------------------------------------------
    // Roll signups into a cumulative user total, starting from the count of
    // users who existed before the window opened.
    // ------------------------------------------------------------------
    const trends: TrendBucket[] = [];
    let running = usersBeforeWindow;
    for (const bucket of buckets.values()) {
      running += bucket.signups;
      bucket.cumulativeUsers = running;
      trends.push(bucket);
    }

    return NextResponse.json({ days, trends });
  } catch (error) {
    console.error("Error in admin metrics trends:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
