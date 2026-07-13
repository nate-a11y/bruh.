import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { recordReferral } from "@/lib/referrals";

// POST /api/referral/claim { code } - record that the current user was referred
// by the owner of `code`. Called shortly after signup with the captured ref
// code. Safe to call more than once (a second call no-ops).
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { code?: string };
    if (!body.code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const admin = createServiceClient();
    const result = await recordReferral(admin, { code: body.code, referredUserId: user.id });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error claiming referral:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
