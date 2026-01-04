import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get blocked sites
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: sites, error } = await (supabase as any)
    .from("zeroed_blocked_sites")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sites: sites || [] });
}

// Add a blocked site
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { pattern, name, category } = body;

  if (!pattern || !name) {
    return NextResponse.json(
      { error: "Pattern and name are required" },
      { status: 400 }
    );
  }

  const { data, error } = await (supabase as any)
    .from("zeroed_blocked_sites")
    .insert({
      user_id: user.id,
      pattern,
      name,
      category: category || "other",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ site: data });
}

// Delete a blocked site
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("id");

  if (!siteId) {
    return NextResponse.json({ error: "Site ID required" }, { status: 400 });
  }

  const { error } = await (supabase as any)
    .from("zeroed_blocked_sites")
    .delete()
    .eq("id", siteId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Toggle a blocked site
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { site_id, is_enabled } = body;

  const { error } = await (supabase as any)
    .from("zeroed_blocked_sites")
    .update({ is_enabled })
    .eq("id", site_id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
