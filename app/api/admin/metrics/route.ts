import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { teamMonthlyCents } from "@/lib/plans";

// GET /api/admin/metrics
//
// Owner metrics dashboard. Admin-gated (isAdmin on the authenticated user) and
// backed by the service-role client. Every query here is READ-ONLY: this route
// never writes or mutates any row.
//
// MRR is computed in cents from two sources:
//   - Personal Pro: each `active` personal subscription bills $19.99/mo (1999c).
//     Trials and free_forever grants contribute $0 (no cash today).
//   - Teams: each team whose subscription_status is `active` bills
//     teamMonthlyCents(seats) = $19.99 base + $12 per additional seat.
// The two are summed and also returned as dollars for display.

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

interface DunningRow {
  user_id: string;
  status: string;
  past_due_since: string | null;
  current_period_end: string | null;
  user_email: string;
  display_name: string | null;
}

const PERSONAL_PRO_CENTS = 1999;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createServiceClient();

    const now = Date.now();
    const weekAgo = new Date(now - 7 * DAY_MS).toISOString();
    const monthAgo = new Date(now - 30 * DAY_MS).toISOString();

    // ------------------------------------------------------------------
    // Subscriptions (personal). Pull the small set of columns we need and
    // aggregate in memory so we can compute counts + churn in one pass.
    // ------------------------------------------------------------------
    const { data: subs } = (await (admin as any)
      .from("zeroed_subscriptions")
      .select("status, canceled_at, updated_at, past_due_since")) as {
      data:
        | Array<{
            status: string;
            canceled_at: string | null;
            updated_at: string | null;
            past_due_since: string | null;
          }>
        | null;
    };

    const subCounts = {
      active: 0,
      trialing: 0,
      past_due: 0,
      canceled: 0,
      free_forever: 0,
      trial_expired: 0,
    };
    let churnedLast30 = 0;

    for (const s of subs || []) {
      switch (s.status) {
        case "active":
          subCounts.active += 1;
          break;
        case "trialing":
          subCounts.trialing += 1;
          break;
        case "past_due":
          subCounts.past_due += 1;
          break;
        case "canceled":
          subCounts.canceled += 1;
          break;
        case "free_forever":
          subCounts.free_forever += 1;
          break;
        case "trial_expired":
          subCounts.trial_expired += 1;
          break;
        default:
          break;
      }

      // Churn: canceled within the last 30 days. Prefer canceled_at, fall back
      // to updated_at for rows canceled before that column was populated.
      if (s.status === "canceled") {
        const when = s.canceled_at || s.updated_at;
        if (when && when >= monthAgo) churnedLast30 += 1;
      }
    }

    // ------------------------------------------------------------------
    // Teams. Count active team subscriptions and sum their per-seat MRR.
    // ------------------------------------------------------------------
    const { data: teams } = (await (admin as any)
      .from("zeroed_teams")
      .select("subscription_status, seats")) as {
      data:
        | Array<{ subscription_status: string | null; seats: number | null }>
        | null;
    };

    let teamMrrCents = 0;
    let activeTeams = 0;
    let trialingTeams = 0;
    for (const t of teams || []) {
      if (t.subscription_status === "active") {
        activeTeams += 1;
        teamMrrCents += teamMonthlyCents(t.seats || 1);
      } else if (t.subscription_status === "trialing") {
        trialingTeams += 1;
      }
    }

    const personalMrrCents = subCounts.active * PERSONAL_PRO_CENTS;
    const mrrCents = personalMrrCents + teamMrrCents;

    // ------------------------------------------------------------------
    // Users + signups. auth.admin.listUsers is paginated (50/page default),
    // so walk pages until exhausted. We derive total users and signups in the
    // trailing week / month from created_at.
    // ------------------------------------------------------------------
    let totalUsers = 0;
    let signupsThisWeek = 0;
    let signupsThisMonth = 0;
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
        totalUsers += 1;
        const created = u.created_at;
        if (created) {
          if (created >= weekAgo) signupsThisWeek += 1;
          if (created >= monthAgo) signupsThisMonth += 1;
        }
      }
      if (batch.length < perPage) break;
      page += 1;
    }

    // ------------------------------------------------------------------
    // Active users proxy: distinct users who created a task in the last 7
    // days. Task creation is our strongest recent-activity signal.
    // ------------------------------------------------------------------
    const { data: recentTasks } = (await admin
      .from("zeroed_tasks")
      .select("user_id")
      .gte("created_at", weekAgo)) as { data: Array<{ user_id: string }> | null };

    const activeUserSet = new Set<string>();
    for (const t of recentTasks || []) {
      if (t.user_id) activeUserSet.add(t.user_id);
    }
    const activeUsers = activeUserSet.size;

    // ------------------------------------------------------------------
    // Dunning: current past_due subscriptions, enriched with email/name for a
    // compact admin list. Ordered by how long they have been past due.
    // ------------------------------------------------------------------
    const { data: pastDueSubs } = (await (admin as any)
      .from("zeroed_subscriptions")
      .select("user_id, status, past_due_since, current_period_end")
      .eq("status", "past_due")
      .order("past_due_since", { ascending: true })
      .limit(10)) as {
      data:
        | Array<{
            user_id: string;
            status: string;
            past_due_since: string | null;
            current_period_end: string | null;
          }>
        | null;
    };

    // ------------------------------------------------------------------
    // Disputes: counts by status + total disputed amount (in cents).
    // ------------------------------------------------------------------
    const { data: disputes } = (await (admin as any)
      .from("zeroed_disputes")
      .select(
        "id, amount, currency, reason, status, evidence_submitted, access_revoked, created_at"
      )
      .order("created_at", { ascending: false })) as { data: DisputeRow[] | null };

    const disputeList = disputes || [];
    const disputeCountsByStatus: Record<string, number> = {};
    let disputedAmountCents = 0;
    let openDisputes = 0;
    for (const d of disputeList) {
      const status = d.status || "unknown";
      disputeCountsByStatus[status] = (disputeCountsByStatus[status] || 0) + 1;
      disputedAmountCents += d.amount || 0;
      // "won"/"warning_closed"/"lost" are resolved; anything else needs eyes.
      if (!["won", "lost", "warning_closed"].includes(status)) openDisputes += 1;
    }

    const recentDisputes = disputeList.slice(0, 10);

    // Enrich dunning + disputes with user email / display name.
    const dunningUserIds = (pastDueSubs || []).map((s) => s.user_id);
    let dunning: DunningRow[] = [];
    if (dunningUserIds.length > 0) {
      const { data: prefs } = await admin
        .from("zeroed_user_preferences")
        .select("user_id, display_name")
        .in("user_id", dunningUserIds);
      const nameMap = new Map(
        (prefs || []).map((p) => [p.user_id, p.display_name])
      );
      // listUsers is expensive; only paginate once for emails.
      const { data: authList } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const emailMap = new Map(
        (authList?.users || []).map((u) => [u.id, u.email || "Unknown"])
      );
      dunning = (pastDueSubs || []).map((s) => ({
        user_id: s.user_id,
        status: s.status,
        past_due_since: s.past_due_since,
        current_period_end: s.current_period_end,
        user_email: emailMap.get(s.user_id) || "Unknown",
        display_name: nameMap.get(s.user_id) || null,
      }));
    }

    return NextResponse.json({
      mrr: {
        cents: mrrCents,
        dollars: Math.round(mrrCents) / 100,
        personalCents: personalMrrCents,
        teamCents: teamMrrCents,
      },
      subscriptions: {
        active: subCounts.active,
        trialing: subCounts.trialing,
        pastDue: subCounts.past_due,
        canceled: subCounts.canceled,
        freeForever: subCounts.free_forever,
        trialExpired: subCounts.trial_expired,
      },
      teams: {
        active: activeTeams,
        trialing: trialingTeams,
      },
      users: {
        total: totalUsers,
        signupsThisWeek,
        signupsThisMonth,
        active7d: activeUsers,
      },
      trialConversion: {
        trialing: subCounts.trialing,
        converted: subCounts.active,
      },
      churn: {
        canceledLast30: churnedLast30,
      },
      dunning: {
        pastDueCount: subCounts.past_due,
        recent: dunning,
      },
      disputes: {
        total: disputeList.length,
        open: openDisputes,
        byStatus: disputeCountsByStatus,
        disputedAmountCents,
        currency: recentDisputes[0]?.currency || "usd",
        recent: recentDisputes,
      },
    });
  } catch (error) {
    console.error("Error in admin metrics:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
