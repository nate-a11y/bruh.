import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { clearPlatformSettingsCache } from "@/lib/platform-settings";

// Platform settings are stored in zeroed_platform_settings table
// This is a simple key-value store for admin settings

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const adminClient = createServiceClient();

  const { data: settings } = await adminClient
    .from("zeroed_platform_settings")
    .select("key, value")
    .in("key", ["maintenance_mode", "signups_enabled", "email_notifications"]);

  // Convert to object with defaults
  const settingsMap: Record<string, boolean> = {
    maintenance_mode: false,
    signups_enabled: true,
    email_notifications: true,
  };

  (settings as Array<{ key: string; value: string }> | null)?.forEach((s) => {
    settingsMap[s.key] = s.value === "true";
  });

  return NextResponse.json({ settings: settingsMap });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { key, value } = await request.json();

  if (!["maintenance_mode", "signups_enabled", "email_notifications"].includes(key)) {
    return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
  }

  const adminClient = createServiceClient();

  // Upsert the setting
  const { error } = await adminClient
    .from("zeroed_platform_settings")
    .upsert(
      { key, value: String(value), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) {
    console.error("Failed to update setting:", error);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }

  // Clear the settings cache so changes take effect immediately
  clearPlatformSettingsCache();

  return NextResponse.json({ success: true, key, value });
}
