import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSlackDM, sendSlackMessage, SlackBlock } from "@/lib/integrations/slack";
import { sendEmail, weeklySummaryEmail } from "@/lib/email";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

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

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();

  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekStartStr = format(lastWeekStart, "yyyy-MM-dd");
    const lastWeekEndStr = format(lastWeekEnd, "yyyy-MM-dd");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let slackSent = 0;
    let emailSent = 0;
    let errors = 0;

    // === SEND EMAIL SUMMARIES ===
    const { data: emailUsers } = await supabase
      .from("zeroed_user_preferences")
      .select("user_id, display_name, weekly_summary_enabled")
      .eq("weekly_summary_enabled", true);

    for (const user of emailUsers || []) {
      try {
        // Get user's email
        const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
        if (!authUser?.user?.email) continue;

        // Get stats
        const { count: tasksCompleted } = await supabase
          .from("zeroed_tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.user_id)
          .eq("status", "completed")
          .gte("completed_at", lastWeekStart.toISOString())
          .lte("completed_at", lastWeekEnd.toISOString());

        const { data: focusSessions } = await supabase
          .from("zeroed_focus_sessions")
          .select("duration_minutes")
          .eq("user_id", user.user_id)
          .gte("started_at", lastWeekStart.toISOString())
          .lte("started_at", lastWeekEnd.toISOString());

        const focusMinutes = (focusSessions || []).reduce(
          (sum, s) => sum + (s.duration_minutes || 0),
          0
        );

        const { data: streakData } = await supabase
          .from("zeroed_user_stats")
          .select("current_streak")
          .eq("user_id", user.user_id)
          .single();

        // Get top project
        const { data: listActivity } = await supabase
          .from("zeroed_tasks")
          .select("list_id, zeroed_lists(name)")
          .eq("user_id", user.user_id)
          .eq("status", "completed")
          .gte("completed_at", lastWeekStart.toISOString())
          .lte("completed_at", lastWeekEnd.toISOString());

        const listCounts: Record<string, { count: number; name: string }> = {};
        for (const task of listActivity || []) {
          if (task.list_id && task.zeroed_lists) {
            const listName = (task.zeroed_lists as any).name;
            if (!listCounts[task.list_id]) {
              listCounts[task.list_id] = { count: 0, name: listName };
            }
            listCounts[task.list_id].count++;
          }
        }
        const topList = Object.values(listCounts).sort((a, b) => b.count - a.count)[0];

        const emailContent = weeklySummaryEmail({
          userName: user.display_name || undefined,
          tasksCompleted: tasksCompleted || 0,
          focusMinutes,
          streakDays: streakData?.current_streak || 0,
          topProject: topList?.name,
          dashboardLink: `${appUrl}/stats`,
        });

        const result = await sendEmail({
          to: authUser.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (result.success) emailSent++;
      } catch (err) {
        console.error(`Email failed for ${user.user_id}:`, err);
        errors++;
      }
    }

    // === SEND SLACK SUMMARIES ===
    const { data: integrations } = await supabase
      .from("zeroed_integrations")
      .select("user_id, access_token, settings")
      .eq("provider", "slack")
      .eq("sync_enabled", true);

    for (const integration of integrations || []) {
      const settings = integration.settings as Record<string, unknown> | null;
      if (!settings?.notify_weekly_summary || !integration.access_token) {
        continue;
      }

      try {
        const { data: prefs } = await supabase
          .from("zeroed_user_preferences")
          .select("display_name, streak_current")
          .eq("user_id", integration.user_id)
          .single();

        const { data: tasks } = await supabase
          .from("zeroed_tasks")
          .select("id, status, completed_at")
          .eq("user_id", integration.user_id)
          .gte("completed_at", lastWeekStartStr)
          .lte("completed_at", lastWeekEndStr);

        const { data: focusSessions } = await supabase
          .from("zeroed_focus_sessions")
          .select("duration_minutes")
          .eq("user_id", integration.user_id)
          .eq("completed", true)
          .gte("created_at", lastWeekStartStr)
          .lte("created_at", lastWeekEndStr);

        const completedTasks = tasks?.length || 0;
        const totalFocusMinutes = focusSessions?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0;
        const focusHours = Math.floor(totalFocusMinutes / 60);
        const focusMins = totalFocusMinutes % 60;
        const streak = prefs?.streak_current || 0;

        const greeting = prefs?.display_name
          ? `Happy Monday ${prefs.display_name}!`
          : "Happy Monday!";

        const blocks: SlackBlock[] = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📊 *Weekly Recap*\n${greeting} Here's how last week went:`,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Tasks Completed*\n${completedTasks} tasks ✅` },
              { type: "mrkdwn", text: `*Focus Time*\n${focusHours}h ${focusMins}m ⏱️` },
              { type: "mrkdwn", text: `*Current Streak*\n${streak} days 🔥` },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `_Week of ${lastWeekStartStr} to ${lastWeekEndStr}_`,
            },
          },
        ];

        await sendNotification(
          integration.access_token,
          settings,
          `${greeting} Your weekly recap is ready.`,
          blocks
        );

        slackSent++;
      } catch (error) {
        console.error(`Slack failed for ${integration.user_id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      message: "Weekly summaries sent",
      email: emailSent,
      slack: slackSent,
      errors,
    });
  } catch (error) {
    console.error("Weekly summary cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
