import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// GET /api/admin/feedback - list feedback (admin only).
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
    const { data } = await admin
      .from("zeroed_feedback")
      .select("id, email, category, message, status, page, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return NextResponse.json({ feedback: data ?? [] });
  } catch (error) {
    console.error("Admin feedback error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH /api/admin/feedback - update a feedback item's status.
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id, status } = (await request.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
    };
    if (!id || !["new", "reviewed", "done"].includes(status || "")) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const admin = createServiceClient();
    await (admin as any).from("zeroed_feedback").update({ status }).eq("id", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin feedback patch error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
