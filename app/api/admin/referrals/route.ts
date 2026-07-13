import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { REFERRAL_REWARD_CENTS } from "@/lib/referrals";

// GET /api/admin/referrals
//
// Owner visibility into the referral loop. Admin-gated (isAdmin on the
// authenticated user) and backed by the service-role client. Every query here
// is READ-ONLY: this route never writes or mutates any row.
//
// Returns three things:
//   - totals: how many referrals exist, how many converted, how many rewards
//     were granted, and the total dollar value of those rewards (in cents).
//   - topReferrers: referrers ranked by total referrals, with converted count
//     and each referrer's email + display name.
//   - recent: the latest referrals, each with referrer email, referred email,
//     status, whether the reward was granted, and when it was created.

interface ReferralRow {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  code: string;
  status: string;
  reward_granted: boolean;
  created_at: string;
  converted_at: string | null;
}

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

const RECENT_LIMIT = 15;
const TOP_REFERRERS_LIMIT = 10;

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

    // ------------------------------------------------------------------
    // All referrals. The table is small (one row per referred person), so we
    // pull everything and aggregate in memory for totals + top referrers.
    // ------------------------------------------------------------------
    const { data: referrals } = (await (admin as any)
      .from("zeroed_referrals")
      .select(
        "id, referrer_user_id, referred_user_id, code, status, reward_granted, created_at, converted_at"
      )
      .order("created_at", { ascending: false })) as {
      data: ReferralRow[] | null;
    };

    const rows = referrals || [];

    // ------------------------------------------------------------------
    // Totals.
    // ------------------------------------------------------------------
    let converted = 0;
    let rewardsGranted = 0;
    for (const r of rows) {
      if (r.status === "converted") converted += 1;
      if (r.reward_granted) rewardsGranted += 1;
    }
    const totalRewardCents = rewardsGranted * REFERRAL_REWARD_CENTS;

    // ------------------------------------------------------------------
    // Group by referrer for the leaderboard: total invited + converted count.
    // ------------------------------------------------------------------
    const byReferrer = new Map<string, { total: number; converted: number }>();
    for (const r of rows) {
      const agg = byReferrer.get(r.referrer_user_id) || { total: 0, converted: 0 };
      agg.total += 1;
      if (r.status === "converted") agg.converted += 1;
      byReferrer.set(r.referrer_user_id, agg);
    }

    // ------------------------------------------------------------------
    // Resolve emails + display names. auth.admin.listUsers is paginated; one
    // page of 1000 covers current volume. Preferences hold display names.
    // ------------------------------------------------------------------
    const { data: authList } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const emailMap = new Map(
      (authList?.users || []).map((u) => [u.id, u.email || "Unknown"])
    );

    // Only look up display names for the users we actually render.
    const referrerIds = Array.from(byReferrer.keys());
    const recentReferredIds = rows.slice(0, RECENT_LIMIT).map((r) => r.referred_user_id);
    const nameLookupIds = Array.from(new Set([...referrerIds, ...recentReferredIds]));

    const nameMap = new Map<string, string | null>();
    if (nameLookupIds.length > 0) {
      const { data: prefs } = await admin
        .from("zeroed_user_preferences")
        .select("user_id, display_name")
        .in("user_id", nameLookupIds);
      for (const p of prefs || []) {
        nameMap.set(p.user_id, p.display_name);
      }
    }

    const topReferrers: TopReferrer[] = referrerIds
      .map((id) => ({
        user_id: id,
        email: emailMap.get(id) || "Unknown",
        display_name: nameMap.get(id) || null,
        total: byReferrer.get(id)?.total || 0,
        converted: byReferrer.get(id)?.converted || 0,
      }))
      .sort((a, b) => b.converted - a.converted || b.total - a.total)
      .slice(0, TOP_REFERRERS_LIMIT);

    // ------------------------------------------------------------------
    // Recent referrals (already ordered newest first).
    // ------------------------------------------------------------------
    const recent: RecentReferral[] = rows.slice(0, RECENT_LIMIT).map((r) => ({
      id: r.id,
      referrer_email: emailMap.get(r.referrer_user_id) || "Unknown",
      referrer_display_name: nameMap.get(r.referrer_user_id) || null,
      referred_email: emailMap.get(r.referred_user_id) || "Unknown",
      code: r.code,
      status: r.status,
      reward_granted: r.reward_granted,
      created_at: r.created_at,
    }));

    return NextResponse.json({
      totals: {
        total: rows.length,
        converted,
        rewardsGranted,
        rewardValueCents: totalRewardCents,
        rewardPerReferralCents: REFERRAL_REWARD_CENTS,
      },
      topReferrers,
      recent,
    });
  } catch (error) {
    console.error("Error in admin referrals:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
