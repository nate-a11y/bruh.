import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sendSlackDM, sendSlackMessage, SlackBlock } from "./slack";

interface SlackNotificationSettings {
  notification_channel_id?: string;
  notify_task_due?: boolean;
  notify_daily_summary?: boolean;
  notify_task_created?: boolean;
  notify_task_completed?: boolean;
  slack_user_id?: string;
}

// Get Slack integration for a user
async function getSlackIntegration(userId: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("zeroed_integrations")
    .select("access_token, settings")
    .eq("user_id", userId)
    .eq("provider", "slack")
    .single();

  if (!data?.access_token) {
    return null;
  }

  return {
    accessToken: data.access_token,
    settings: data.settings as SlackNotificationSettings | null,
  };
}

// Send a notification to the configured channel or DM
async function sendNotification(
  accessToken: string,
  settings: SlackNotificationSettings | null,
  text: string,
  blocks?: SlackBlock[]
) {
  const channelId = settings?.notification_channel_id;
  const slackUserId = settings?.slack_user_id;

  if (channelId && channelId !== "dm") {
    // Send to specific channel
    return sendSlackMessage(accessToken, { channel: channelId, text, blocks });
  } else if (slackUserId) {
    // Send as DM
    return sendSlackDM(accessToken, slackUserId, text, blocks);
  }

  // No valid destination
  return { ok: false, error: "No notification destination configured" };
}

// Notify when a task is created
export async function notifyTaskCreated(
  userId: string,
  task: { id: string; title: string; due_date?: string | null }
) {
  try {
    const integration = await getSlackIntegration(userId);
    if (!integration) return;

    // Check if notifications are enabled (default: false for task created)
    if (integration.settings?.notify_task_created !== true) return;

    const dueText = task.due_date ? ` (due ${task.due_date})` : "";
    const text = `📝 New task: ${task.title}${dueText}`;

    const blocks: SlackBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📝 *New task created*\n${task.title}${dueText}`,
        },
      },
    ];

    await sendNotification(integration.accessToken, integration.settings, text, blocks);
    console.log(`Sent task created notification for task ${task.id}`);
  } catch (error) {
    console.error("Failed to send task created notification:", error);
  }
}

// Notify when a task is completed
export async function notifyTaskCompleted(
  userId: string,
  task: { id: string; title: string }
) {
  try {
    const integration = await getSlackIntegration(userId);
    if (!integration) return;

    // Check if notifications are enabled (default: false for task completed)
    if (integration.settings?.notify_task_completed !== true) return;

    const text = `✅ Completed: ${task.title}`;

    const blocks: SlackBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *Task completed!*\n~${task.title}~`,
        },
      },
    ];

    await sendNotification(integration.accessToken, integration.settings, text, blocks);
    console.log(`Sent task completed notification for task ${task.id}`);
  } catch (error) {
    console.error("Failed to send task completed notification:", error);
  }
}
