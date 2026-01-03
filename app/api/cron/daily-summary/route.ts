import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSlackDM, formatTodaySummary } from "@/lib/integrations/slack";

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

      const slackUserId = settings.slack_user_id as string;
      if (!slackUserId || !integration.access_token) {
        continue;
      }

      try {
        // Get today's tasks for this user
        const { data: tasks } = await supabase
          .from("zeroed_tasks")
          .select("id, title, due_time, status")
          .eq("user_id", integration.user_id)
          .eq("due_date", today)
          .neq("status", "cancelled")
          .order("due_time", { ascending: true, nullsFirst: false });

        // Send the summary
        const blocks = formatTodaySummary(tasks || []);
        await sendSlackDM(
          integration.access_token,
          slackUserId,
          `Good morning! Here's your task summary for today.`,
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
