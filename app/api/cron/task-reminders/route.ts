import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSlackDM, sendSlackMessage, SlackBlock } from "@/lib/integrations/slack";

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
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = now.getMinutes();

    // Only send reminders at the top of the hour (within first 5 minutes)
    if (currentMinute > 5) {
      return NextResponse.json({ message: "Not reminder time", sent: 0 });
    }

    let sent = 0;
    let errors = 0;

    // Get all users with Slack integration enabled for task reminders
    const { data: integrations } = await supabase
      .from("zeroed_integrations")
      .select("user_id, access_token, settings")
      .eq("provider", "slack")
      .eq("sync_enabled", true);

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({ message: "No integrations to process", sent: 0 });
    }

    for (const integration of integrations) {
      // Check if task due notifications are enabled
      const settings = integration.settings as Record<string, unknown> | null;
      if (!settings?.notify_task_due) {
        continue;
      }

      if (!integration.access_token) {
        continue;
      }

      try {
        // Get tasks due this hour
        const { data: tasks } = await supabase
          .from("zeroed_tasks")
          .select("id, title, due_time")
          .eq("user_id", integration.user_id)
          .eq("due_date", today)
          .eq("status", "pending")
          .like("due_time", `${currentHour}:%`);

        if (!tasks || tasks.length === 0) {
          continue;
        }

        // Send reminder for each task
        for (const task of tasks) {
          const blocks: SlackBlock[] = [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `⏰ *${task.title}*\nDue: ${task.due_time}`,
              },
              accessory: {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Mark Done",
                  emoji: true,
                },
                action_id: "complete_task",
                value: task.id,
                style: "primary",
              },
            },
          ];
          await sendNotification(
            integration.access_token,
            settings,
            `⏰ Reminder: *${task.title}* is due now!`,
            blocks
          );
          sent++;
        }
      } catch (error) {
        console.error(`Failed to send reminder to user ${integration.user_id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      message: "Task reminders sent",
      sent,
      errors,
    });
  } catch (error) {
    console.error("Task reminders cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
