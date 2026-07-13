import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { ROADMAP_STATUSES } from "@/app/api/roadmap/route";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return null;
  return user;
}

// POST /api/admin/roadmap - admin creates a roadmap item (to seed the board).
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    status?: string;
  };
  const title = (body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const status = ROADMAP_STATUSES.includes(body.status as any) ? body.status : "planned";
  const admin = createServiceClient();
  const { error } = await (admin as any)
    .from("zeroed_roadmap_items")
    .insert({ title, description: (body.description || "").trim() || null, status });
  if (error) return NextResponse.json({ error: "Could not create" }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH /api/admin/roadmap - update status / title / description.
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    title?: string;
    description?: string;
  };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) {
    if (!ROADMAP_STATUSES.includes(body.status as any)) {
      return NextResponse.json({ error: "Bad status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.description === "string") patch.description = body.description.trim() || null;

  const admin = createServiceClient();
  await (admin as any).from("zeroed_roadmap_items").update(patch).eq("id", body.id);
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/roadmap?id=... - remove an item.
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const admin = createServiceClient();
  await (admin as any).from("zeroed_roadmap_items").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
