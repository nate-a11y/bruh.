import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pullChangesFromCalendar } from "@/lib/integrations/google-calendar";

// Google Calendar push notification webhook
// Receives notifications when calendar events change
export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Google sends these headers with push notifications
    const channelId = request.headers.get("x-goog-channel-id");
    const channelToken = request.headers.get("x-goog-channel-token");
    const resourceState = request.headers.get("x-goog-resource-state");
    const resourceId = request.headers.get("x-goog-resource-id");

    console.log("Calendar webhook received:", { channelId, resourceState, resourceId });

    // Ignore sync messages (sent when watch is first created)
    if (resourceState === "sync") {
      return NextResponse.json({ ok: true });
    }

    // channelId format: "bruh-calendar-{userId}"
    if (!channelId?.startsWith("bruh-calendar-")) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }

    const userId = channelId.replace("bruh-calendar-", "");

    // Verify this user has an active integration
    const { data: integration } = await supabase
      .from("zeroed_integrations")
      .select("id, sync_enabled, settings")
      .eq("user_id", userId)
      .eq("provider", "google_calendar")
      .single();

    if (!integration?.sync_enabled) {
      return NextResponse.json({ ok: true }); // Ignore if not enabled
    }

    // Verify the channel token so an attacker can't spoof x-goog-channel-id to
    // force a sync for an arbitrary user. Prefer the per-channel token stored on
    // the integration; fall back to a shared secret. NOTE: GOOGLE_WEBHOOK_TOKEN
    // must be set and passed as the `token` field when creating the watch channel
    // (setupCalendarWatch) for this verification to succeed.
    const storedToken =
      (integration.settings as { watch_channel_token?: string } | null)
        ?.watch_channel_token;
    const expectedToken = storedToken || process.env.GOOGLE_WEBHOOK_TOKEN;

    if (!expectedToken || channelToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pull changes from calendar
    const result = await pullChangesFromCalendar(userId);
    console.log(`Calendar webhook sync for ${userId}:`, result);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Calendar webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

// Google also sends a verification ping on initial setup
export async function GET() {
  return NextResponse.json({ ok: true });
}
