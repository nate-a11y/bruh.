import { createServiceClient } from "@/lib/supabase/server";

export type PlatformSetting = "maintenance_mode" | "signups_enabled" | "email_notifications";

const settingDefaults: Record<PlatformSetting, boolean> = {
  maintenance_mode: false,
  signups_enabled: true,
  email_notifications: true,
};

// Cache settings for 30 seconds to avoid hitting DB on every request
let settingsCache: Record<string, boolean> | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function getPlatformSetting(key: PlatformSetting): Promise<boolean> {
  const settings = await getAllPlatformSettings();
  return settings[key] ?? settingDefaults[key];
}

export async function getAllPlatformSettings(): Promise<Record<PlatformSetting, boolean>> {
  // Return cached settings if still valid
  if (settingsCache && Date.now() < cacheExpiry) {
    return settingsCache as Record<PlatformSetting, boolean>;
  }

  try {
    const adminClient = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings } = await (adminClient as any)
      .from("zeroed_platform_settings")
      .select("key, value")
      .in("key", ["maintenance_mode", "signups_enabled", "email_notifications"]);

    const result = { ...settingDefaults };
    (settings as Array<{ key: string; value: string }> | null)?.forEach((s) => {
      if (s.key in result) {
        result[s.key as PlatformSetting] = s.value === "true";
      }
    });

    // Update cache
    settingsCache = result;
    cacheExpiry = Date.now() + CACHE_TTL;

    return result;
  } catch (error) {
    console.error("Failed to fetch platform settings:", error);
    return settingDefaults;
  }
}

// Clear the cache (call after updating settings)
export function clearPlatformSettingsCache() {
  settingsCache = null;
  cacheExpiry = 0;
}
