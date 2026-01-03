import crypto from "crypto";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET!;

// Remove trailing slash from app URL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

export interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
  };
  error?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: { type: string; text: string; emoji?: boolean };
    action_id?: string;
    value?: string;
    style?: string;
  }>;
  accessory?: {
    type: string;
    text?: { type: string; text: string; emoji?: boolean };
    action_id?: string;
    value?: string;
    style?: string;
  };
}

/**
 * Generate the Slack OAuth authorization URL
 */
export function getSlackAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    scope: "chat:write,commands,users:read,channels:read,groups:read",
    redirect_uri: `${APP_URL}/api/integrations/slack/callback`,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<SlackOAuthResponse> {
  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      redirect_uri: `${APP_URL}/api/integrations/slack/callback`,
    }),
  });

  return response.json();
}

/**
 * Verify Slack request signature
 */
export function verifySlackRequest(
  signature: string,
  timestamp: string,
  body: string
): boolean {
  // Check timestamp to prevent replay attacks (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 60 * 5) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = `v0=${crypto
    .createHmac("sha256", SLACK_SIGNING_SECRET)
    .update(sigBasestring)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

/**
 * Send a message to a Slack channel
 */
export async function sendSlackMessage(
  accessToken: string,
  message: SlackMessage
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  return response.json();
}

/**
 * Send a DM to a Slack user
 */
export async function sendSlackDM(
  accessToken: string,
  userId: string,
  text: string,
  blocks?: SlackBlock[]
): Promise<{ ok: boolean; error?: string }> {
  // Open a DM channel first
  const openResponse = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ users: userId }),
  });

  const openResult = await openResponse.json();
  if (!openResult.ok) {
    return { ok: false, error: openResult.error };
  }

  // Send the message
  return sendSlackMessage(accessToken, {
    channel: openResult.channel.id,
    text,
    blocks,
  });
}

/**
 * Format a task for Slack display
 */
export function formatTaskForSlack(task: {
  id: string;
  title: string;
  due_date?: string | null;
  due_time?: string | null;
  status: string;
}): SlackBlock[] {
  const dueText = task.due_date
    ? task.due_time
      ? `Due: ${task.due_date} at ${task.due_time}`
      : `Due: ${task.due_date}`
    : "No due date";

  const statusEmoji = task.status === "completed" ? "✅" : "⬜";

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${statusEmoji} *${task.title}*\n${dueText}`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: task.status === "completed" ? "Undo" : "Done",
          emoji: true,
        },
        action_id: "toggle_task",
        value: task.id,
        style: task.status === "completed" ? undefined : "primary",
      },
    },
  ];
}

/**
 * List available channels in the workspace
 */
export async function listChannels(
  accessToken: string
): Promise<{ ok: boolean; channels?: Array<{ id: string; name: string; is_private: boolean }>; error?: string }> {
  const response = await fetch(
    "https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  if (!data.ok) {
    return { ok: false, error: data.error };
  }

  return {
    ok: true,
    channels: data.channels?.map((ch: { id: string; name: string; is_private: boolean }) => ({
      id: ch.id,
      name: ch.name,
      is_private: ch.is_private,
    })) || [],
  };
}

/**
 * Format today's tasks summary for Slack
 */
export function formatTodaySummary(tasks: Array<{
  id: string;
  title: string;
  due_time?: string | null;
  status: string;
}>): SlackBlock[] {
  if (tasks.length === 0) {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🎉 *No tasks for today!* Take a break or get ahead on tomorrow's work.",
        },
      },
    ];
  }

  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📋 *Today's Tasks* (${completed}/${total} done)`,
      },
    },
  ];

  tasks.forEach((task) => {
    const emoji = task.status === "completed" ? "✅" : "⬜";
    const timeText = task.due_time ? ` _(${task.due_time})_` : "";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} ${task.title}${timeText}`,
      },
    });
  });

  return blocks;
}
