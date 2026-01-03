import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sync_enabled, settings } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof sync_enabled === "boolean") {
      updateData.sync_enabled = sync_enabled;
    }

    if (settings) {
      // Merge with existing settings
      const { data: existing } = await supabase
        .from("zeroed_integrations")
        .select("settings")
        .eq("user_id", user.id)
        .eq("provider", "google_calendar")
        .single();

      updateData.settings = {
        ...(existing?.settings || {}),
        ...settings,
      };
    }

    const { error } = await supabase
      .from("zeroed_integrations")
      .update(updateData)
      .eq("user_id", user.id)
      .eq("provider", "google_calendar");

    if (error) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
