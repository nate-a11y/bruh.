import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/roadmap/vote { itemId } - toggle the caller's vote on an item.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { itemId } = (await request.json().catch(() => ({}))) as { itemId?: string };
    if (!itemId) return NextResponse.json({ error: "Missing itemId" }, { status: 400 });

    const client = supabase as any;
    const { data: existing } = await client
      .from("zeroed_roadmap_votes")
      .select("id")
      .eq("item_id", itemId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await client.from("zeroed_roadmap_votes").delete().eq("id", existing.id);
      return NextResponse.json({ voted: false });
    }
    const { error } = await client
      .from("zeroed_roadmap_votes")
      .insert({ item_id: itemId, user_id: user.id });
    if (error) return NextResponse.json({ error: "Could not vote" }, { status: 500 });
    return NextResponse.json({ voted: true });
  } catch (error) {
    console.error("Roadmap vote error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
