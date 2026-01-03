import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: integration } = await supabase
    .from("zeroed_integrations")
    .select("settings, sync_enabled")
    .eq("user_id", user.id)
    .eq("provider", "notion")
    .single();

  return NextResponse.json({
    settings: integration?.settings || {},
    sync_enabled: integration?.sync_enabled || false,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { settings, sync_enabled } = body;

  // Get existing integration
  const { data: existing } = await supabase
    .from("zeroed_integrations")
    .select("settings")
    .eq("user_id", user.id)
    .eq("provider", "notion")
    .single();

  const existingSettings = existing?.settings &&
    typeof existing.settings === "object" &&
    !Array.isArray(existing.settings)
      ? existing.settings
      : {};

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (settings !== undefined) {
    updateData.settings = {
      ...existingSettings,
      ...settings,
    };
  }

  if (sync_enabled !== undefined) {
    updateData.sync_enabled = sync_enabled;
  }

  const { error } = await supabase
    .from("zeroed_integrations")
    .update(updateData)
    .eq("user_id", user.id)
    .eq("provider", "notion");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
