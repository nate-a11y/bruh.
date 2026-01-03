import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyApiKey } from "@/lib/webhooks";
import type { IncomingWebhookPayload } from "@/lib/supabase/types";

// POST /api/webhooks/incoming - Receive webhooks from external services (Zapier, Make, etc.)
export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const authHeader = request.headers.get("authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API key. Include 'Authorization: Bearer bruh_xxx' header." },
        { status: 401 }
      );
    }

    // Verify API key
    const { valid, userId } = await verifyApiKey(apiKey);
    if (!valid || !userId) {
      return NextResponse.json(
        { error: "Invalid or expired API key" },
        { status: 401 }
      );
    }

    // Parse payload
    const payload: IncomingWebhookPayload = await request.json();

    if (!payload.action || !payload.data) {
      return NextResponse.json(
        { error: "Invalid payload. Must include 'action' and 'data' fields." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    switch (payload.action) {
      case "create_task": {
        if (!payload.data.title) {
          return NextResponse.json(
            { error: "Missing required field: title" },
            { status: 400 }
          );
        }

        // Get or find list
        let listId: string;
        if (payload.data.list_name) {
          const { data: list } = await supabase
            .from("zeroed_lists")
            .select("id")
            .eq("user_id", userId)
            .ilike("name", payload.data.list_name)
            .single();

          if (!list) {
            return NextResponse.json(
              { error: `List "${payload.data.list_name}" not found` },
              { status: 404 }
            );
          }
          listId = list.id;
        } else {
          // Use Inbox as default
          const { data: inbox } = await supabase
            .from("zeroed_lists")
            .select("id")
            .eq("user_id", userId)
            .eq("name", "Inbox")
            .single();

          if (!inbox) {
            return NextResponse.json(
              { error: "No Inbox list found. Create one first." },
              { status: 404 }
            );
          }
          listId = inbox.id;
        }

        // Create task
        const { data: task, error } = await supabase
          .from("zeroed_tasks")
          .insert({
            user_id: userId,
            list_id: listId,
            title: payload.data.title,
            notes: payload.data.notes || null,
            due_date: payload.data.due_date || null,
            due_time: payload.data.due_time || null,
            priority: payload.data.priority || "normal",
            status: "pending",
          })
          .select()
          .single();

        if (error) {
          console.error("Task creation error:", error);
          return NextResponse.json(
            { error: "Failed to create task" },
            { status: 500 }
          );
        }

        // Handle tags
        if (payload.data.tags && payload.data.tags.length > 0) {
          for (const tagName of payload.data.tags) {
            // Find or create tag
            let { data: tag } = await supabase
              .from("zeroed_tags")
              .select("id")
              .eq("user_id", userId)
              .ilike("name", tagName)
              .single();

            if (!tag) {
              const { data: newTag } = await supabase
                .from("zeroed_tags")
                .insert({ user_id: userId, name: tagName })
                .select("id")
                .single();
              tag = newTag;
            }

            if (tag) {
              await supabase.from("zeroed_task_tags").insert({
                task_id: task.id,
                tag_id: tag.id,
              });
            }
          }
        }

        return NextResponse.json({
          success: true,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
          },
        });
      }

      case "update_task": {
        if (!payload.data.task_id) {
          return NextResponse.json(
            { error: "Missing required field: task_id" },
            { status: 400 }
          );
        }

        const updates: Record<string, unknown> = {};
        if (payload.data.title) updates.title = payload.data.title;
        if (payload.data.notes !== undefined) updates.notes = payload.data.notes;
        if (payload.data.due_date !== undefined) updates.due_date = payload.data.due_date;
        if (payload.data.due_time !== undefined) updates.due_time = payload.data.due_time;
        if (payload.data.priority) updates.priority = payload.data.priority;

        const { data: task, error } = await supabase
          .from("zeroed_tasks")
          .update(updates)
          .eq("id", payload.data.task_id)
          .eq("user_id", userId)
          .select()
          .single();

        if (error || !task) {
          return NextResponse.json(
            { error: "Task not found or update failed" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
          },
        });
      }

      case "complete_task": {
        if (!payload.data.task_id) {
          return NextResponse.json(
            { error: "Missing required field: task_id" },
            { status: 400 }
          );
        }

        const { data: task, error } = await supabase
          .from("zeroed_tasks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", payload.data.task_id)
          .eq("user_id", userId)
          .select()
          .single();

        if (error || !task) {
          return NextResponse.json(
            { error: "Task not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            completed_at: task.completed_at,
          },
        });
      }

      case "delete_task": {
        if (!payload.data.task_id) {
          return NextResponse.json(
            { error: "Missing required field: task_id" },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("zeroed_tasks")
          .delete()
          .eq("id", payload.data.task_id)
          .eq("user_id", userId);

        if (error) {
          return NextResponse.json(
            { error: "Task not found or delete failed" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Task deleted",
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${payload.action}. Valid actions: create_task, update_task, complete_task, delete_task` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/webhooks/incoming - Documentation endpoint
export async function GET() {
  return NextResponse.json({
    name: "Bruh Incoming Webhook API",
    version: "1.0",
    description: "Receive events from external services like Zapier, Make, n8n",
    authentication: "Bearer token (API key) in Authorization header",
    endpoints: {
      "POST /api/webhooks/incoming": {
        description: "Process incoming webhook events",
        actions: {
          create_task: {
            description: "Create a new task",
            required: ["title"],
            optional: ["notes", "due_date", "due_time", "priority", "list_name", "tags"],
          },
          update_task: {
            description: "Update an existing task",
            required: ["task_id"],
            optional: ["title", "notes", "due_date", "due_time", "priority"],
          },
          complete_task: {
            description: "Mark a task as complete",
            required: ["task_id"],
          },
          delete_task: {
            description: "Delete a task",
            required: ["task_id"],
          },
        },
        example: {
          action: "create_task",
          data: {
            title: "Review Q4 report",
            notes: "Check the financials section",
            due_date: "2024-01-15",
            priority: "high",
            list_name: "Work",
            tags: ["review", "quarterly"],
          },
        },
      },
    },
  });
}
