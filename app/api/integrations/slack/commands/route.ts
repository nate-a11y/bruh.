import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySlackRequest, formatTodaySummary } from "@/lib/integrations/slack";

interface SlackCommandPayload {
  command: string;
  text: string;
  user_id: string;
  user_name: string;
  team_id: string;
  channel_id: string;
  response_url: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-slack-signature") || "";
    const timestamp = request.headers.get("x-slack-request-timestamp") || "";

    // Verify the request is from Slack
    if (!verifySlackRequest(signature, timestamp, body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse the form data
    const params = new URLSearchParams(body);
    const payload: SlackCommandPayload = {
      command: params.get("command") || "",
      text: params.get("text") || "",
      user_id: params.get("user_id") || "",
      user_name: params.get("user_name") || "",
      team_id: params.get("team_id") || "",
      channel_id: params.get("channel_id") || "",
      response_url: params.get("response_url") || "",
    };

    const supabase = await createClient();

    // Find the user by their Slack integration
    const { data: integration } = await supabase
      .from("zeroed_integrations")
      .select("user_id, settings")
      .eq("provider", "slack")
      .filter("settings->slack_user_id", "eq", payload.user_id)
      .single();

    if (!integration) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "❌ Your Slack account isn't connected to bruh. Visit getbruh.app/settings to connect.",
      });
    }

    const userId = integration.user_id;
    const args = payload.text.trim().split(/\s+/);
    const subcommand = args[0]?.toLowerCase() || "today";
    const taskText = args.slice(1).join(" ");

    switch (subcommand) {
      case "add": {
        if (!taskText) {
          return NextResponse.json({
            response_type: "ephemeral",
            text: "Usage: `/bruh add Buy groceries`",
          });
        }

        // Get user's default list (Inbox)
        const { data: defaultList } = await supabase
          .from("zeroed_lists")
          .select("id")
          .eq("user_id", userId)
          .eq("name", "Inbox")
          .single();

        if (!defaultList) {
          return NextResponse.json({
            response_type: "ephemeral",
            text: "❌ Could not find your Inbox list. Please visit getbruh.app to set up.",
          });
        }

        // Create the task
        const { data: task, error } = await supabase
          .from("zeroed_tasks")
          .insert({
            user_id: userId,
            list_id: defaultList.id,
            title: taskText,
            status: "pending",
            due_date: new Date().toISOString().split("T")[0], // Today
          })
          .select()
          .single();

        if (error) {
          console.error("Task creation error:", error);
          return NextResponse.json({
            response_type: "ephemeral",
            text: "❌ Failed to create task. Try again.",
          });
        }

        return NextResponse.json({
          response_type: "ephemeral",
          text: `✅ Added: *${task.title}*`,
        });
      }

      case "today": {
        // Get today's tasks
        const today = new Date().toISOString().split("T")[0];
        const { data: tasks } = await supabase
          .from("zeroed_tasks")
          .select("id, title, due_time, status")
          .eq("user_id", userId)
          .eq("due_date", today)
          .neq("status", "cancelled")
          .order("due_time", { ascending: true, nullsFirst: false });

        return NextResponse.json({
          response_type: "ephemeral",
          blocks: formatTodaySummary(tasks || []),
        });
      }

      case "done": {
        if (!taskText) {
          return NextResponse.json({
            response_type: "ephemeral",
            text: "Usage: `/bruh done [task name or part of it]`",
          });
        }

        // Find and complete the task
        const today = new Date().toISOString().split("T")[0];
        const { data: tasks } = await supabase
          .from("zeroed_tasks")
          .select("id, title")
          .eq("user_id", userId)
          .eq("status", "pending")
          .ilike("title", `%${taskText}%`)
          .limit(1);

        if (!tasks || tasks.length === 0) {
          return NextResponse.json({
            response_type: "ephemeral",
            text: `❌ No pending task found matching "${taskText}"`,
          });
        }

        const task = tasks[0];
        await supabase
          .from("zeroed_tasks")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", task.id);

        return NextResponse.json({
          response_type: "ephemeral",
          text: `✅ Completed: *${task.title}*`,
        });
      }

      case "help":
      default: {
        return NextResponse.json({
          response_type: "ephemeral",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*bruh. Commands*",
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "• `/bruh today` - See today's tasks\n• `/bruh add [task]` - Add a new task for today\n• `/bruh done [task]` - Mark a task as complete\n• `/bruh help` - Show this help",
              },
            },
          ],
        });
      }
    }
  } catch (error) {
    console.error("Slack command error:", error);
    return NextResponse.json({
      response_type: "ephemeral",
      text: "❌ Something went wrong. Try again.",
    });
  }
}
