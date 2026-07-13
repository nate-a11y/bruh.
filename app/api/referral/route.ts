import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOrCreateReferralCode, REFERRAL_REWARD_CENTS } from "@/lib/referrals";

// GET /api/referral - the caller's referral code, link, and running stats.
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceClient();
    const code = await getOrCreateReferralCode(admin, user.id);

    const { data: rows } = await admin
      .from("zeroed_referrals")
      .select("status, reward_granted")
      .eq("referrer_user_id", user.id);

    const list = rows || [];
    const total = list.length;
    const converted = list.filter((r: any) => r.status === "converted").length;
    const rewards = list.filter((r: any) => r.reward_granted).length;

    const base = process.env.NEXT_PUBLIC_APP_URL || "https://getbruh.app";
    return NextResponse.json({
      code,
      link: `${base}/?ref=${code}`,
      stats: { total, converted, rewards, rewardCents: REFERRAL_REWARD_CENTS },
    });
  } catch (error) {
    console.error("Error in referral route:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
