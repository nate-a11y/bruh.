import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSlackDM, sendSlackMessage, formatTodaySummary, SlackBlock } from "@/lib/integrations/slack";

// Send notification to configured channel or DM
async function sendNotification(
  accessToken: string,
  settings: Record<string, unknown>,
  text: string,
  blocks?: SlackBlock[]
) {
  const channelId = settings?.notification_channel_id as string | undefined;
  const slackUserId = settings?.slack_user_id as string | undefined;

  if (channelId && channelId !== "dm") {
    return sendSlackMessage(accessToken, { channel: channelId, text, blocks });
  } else if (slackUserId) {
    return sendSlackDM(accessToken, slackUserId, text, blocks);
  }
  return { ok: false, error: "No destination configured" };
}

export async function GET(request: NextRequest) {
  // Use service role for cron jobs (no user context)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    let sent = 0;
    let errors = 0;

    // Get all users with Slack integration enabled for daily summary
    const { data: integrations } = await supabase
      .from("zeroed_integrations")
      .select("user_id, access_token, settings")
      .eq("provider", "slack")
      .eq("sync_enabled", true);

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({ message: "No integrations to process", sent: 0 });
    }

    for (const integration of integrations) {
      // Check if daily summary is enabled
      const settings = integration.settings as Record<string, unknown> | null;
      if (!settings?.notify_daily_summary) {
        continue;
      }

      if (!integration.access_token) {
        continue;
      }

      try {
        // Get user's display name
        const { data: prefs } = await supabase
          .from("zeroed_user_preferences")
          .select("display_name")
          .eq("user_id", integration.user_id)
          .single();

        // Get today's tasks for this user
        const { data: tasks } = await supabase
          .from("zeroed_tasks")
          .select("id, title, due_time, status")
          .eq("user_id", integration.user_id)
          .eq("due_date", today)
          .neq("status", "cancelled")
          .order("due_time", { ascending: true, nullsFirst: false });

        // Send the summary with personalized greeting
        const blocks = formatTodaySummary(tasks || []);
        const greeting = prefs?.display_name
          ? `Good morning ${prefs.display_name}! Here's your task summary for today.`
          : `Good morning! Here's your task summary for today.`;
        await sendNotification(
          integration.access_token,
          settings,
          greeting,
          blocks
        );

        sent++;
      } catch (error) {
        console.error(`Failed to send summary to user ${integration.user_id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      message: "Daily summaries sent",
      sent,
      errors,
    });
  } catch (error) {
    console.error("Daily summary cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
