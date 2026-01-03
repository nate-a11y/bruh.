import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notionRequest } from "@/lib/integrations/notion";
import { getValidAccessToken } from "@/lib/integrations/google-calendar";

interface HealthStatus {
  provider: string;
  connected: boolean;
  healthy: boolean;
  error?: string;
  lastSync?: string | null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all integrations for the user
    const { data: integrations } = await supabase
      .from("zeroed_integrations")
      .select("provider, access_token, sync_enabled, last_sync_at, settings")
      .eq("user_id", user.id);

    const health: HealthStatus[] = [];

    for (const integration of integrations || []) {
      const status: HealthStatus = {
        provider: integration.provider,
        connected: !!integration.access_token,
        healthy: false,
        lastSync: integration.last_sync_at,
      };

      if (!integration.access_token) {
        status.error = "Not connected";
        health.push(status);
        continue;
      }

      try {
        switch (integration.provider) {
          case "notion": {
            // Test Notion API access
            await notionRequest(integration.access_token, "/users/me", "GET");
            status.healthy = true;
            break;
          }
          case "google_calendar": {
            // Test Google Calendar API access
            const accessToken = await getValidAccessToken(user.id);
            if (accessToken) {
              const res = await fetch(
                "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              if (res.ok) {
                status.healthy = true;
              } else {
                status.error = "Token expired or revoked";
              }
            } else {
              status.error = "Unable to refresh token";
            }
            break;
          }
          case "slack": {
            // Test Slack API access
            const res = await fetch("https://slack.com/api/auth.test", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${integration.access_token}`,
                "Content-Type": "application/json",
              },
            });
            const data = await res.json();
            if (data.ok) {
              status.healthy = true;
            } else {
              status.error = data.error || "Token invalid";
            }
            break;
          }
          default:
            status.healthy = true;
        }
      } catch (error) {
        status.error = error instanceof Error ? error.message : "Connection failed";
      }

      health.push(status);
    }

    return NextResponse.json({ health });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}
