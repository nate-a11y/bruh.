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
    const { settings } = body;

    if (settings) {
      // Merge with existing settings
      const { data: existing } = await supabase
        .from("zeroed_integrations")
        .select("settings")
        .eq("user_id", user.id)
        .eq("provider", "slack")
        .single();

      // Type guard: ensure existing settings is an object before spreading
      const existingSettings = existing?.settings &&
        typeof existing.settings === "object" &&
        !Array.isArray(existing.settings)
          ? existing.settings
          : {};

      const { error } = await supabase
        .from("zeroed_integrations")
        .update({
          settings: {
            ...existingSettings,
            ...settings,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("provider", "slack");

      if (error) {
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
