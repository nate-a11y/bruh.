import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const ROADMAP_STATUSES = ["under_review", "planned", "in_progress", "done", "declined"] as const;

// GET /api/roadmap - all items with vote counts + whether the caller voted.
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceClient() as any;
    const [{ data: items }, { data: votes }] = await Promise.all([
      admin
        .from("zeroed_roadmap_items")
        .select("id, title, description, status, created_at")
        .order("created_at", { ascending: false }),
      admin.from("zeroed_roadmap_votes").select("item_id, user_id"),
    ]);

    const counts = new Map<string, number>();
    const mine = new Set<string>();
    for (const v of (votes ?? []) as { item_id: string; user_id: string }[]) {
      counts.set(v.item_id, (counts.get(v.item_id) ?? 0) + 1);
      if (v.user_id === user.id) mine.add(v.item_id);
    }

    const enriched = (items ?? [])
      .map((it: any) => ({ ...it, votes: counts.get(it.id) ?? 0, voted: mine.has(it.id) }))
      .sort((a: { votes: number }, b: { votes: number }) => b.votes - a.votes);

    return NextResponse.json({ items: enriched });
  } catch (error) {
    console.error("Roadmap GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/roadmap - submit a new feature request (starts under_review).
export async function POST(request: Request) {
  try {
    const rl = await rateLimit("auth", clientIp(await headers()));
    if (!rl.ok) return NextResponse.json({ error: "Too many submissions." }, { status: 429 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { title?: string; description?: string };
    const title = (body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (title.length > 140) return NextResponse.json({ error: "Title is too long" }, { status: 400 });
    const description = (body.description || "").trim().slice(0, 2000) || null;

    const { data: item, error } = await (supabase as any)
      .from("zeroed_roadmap_items")
      .insert({ title, description, created_by: user.id })
      .select("id")
      .single();
    if (error || !item) {
      console.error("Roadmap insert failed:", error);
      return NextResponse.json({ error: "Could not submit" }, { status: 500 });
    }

    // The submitter auto-upvotes their own request.
    await (supabase as any)
      .from("zeroed_roadmap_votes")
      .insert({ item_id: item.id, user_id: user.id })
      .then(undefined, () => {});

    return NextResponse.json({ success: true, id: item.id });
  } catch (error) {
    console.error("Roadmap POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
