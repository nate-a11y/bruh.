import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseNaturalLanguageTask } from "@/lib/utils/natural-language-parser";

// Create service role client at runtime (not module load time)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface InboundEmail {
  // Common fields from email services like SendGrid, Mailgun, Postmark
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  // For verification
  token?: string;
}

/**
 * Inbound email webhook handler
 * Supports SendGrid, Mailgun, and Postmark formats
 */
export async function POST(request: Request) {
  const supabase = getServiceClient();

  try {
    const contentType = request.headers.get("content-type") || "";
    let email: InboundEmail;

    // Parse based on content type
    if (contentType.includes("application/json")) {
      email = await request.json();
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      email = {
        from: formData.get("from")?.toString() || formData.get("sender")?.toString() || "",
        to: formData.get("to")?.toString() || formData.get("recipient")?.toString() || "",
        subject: formData.get("subject")?.toString() || "",
        text: formData.get("text")?.toString() || formData.get("body-plain")?.toString() || "",
        html: formData.get("html")?.toString() || formData.get("body-html")?.toString() || "",
      };
    } else {
      // URL encoded
      const text = await request.text();
      const params = new URLSearchParams(text);
      email = {
        from: params.get("from") || params.get("sender") || "",
        to: params.get("to") || params.get("recipient") || "",
        subject: params.get("subject") || "",
        text: params.get("text") || params.get("body-plain") || "",
      };
    }

    // Extract user's unique email address to find the user
    // Format: task+{unique_id}@bruh.app or {unique_id}@task.bruh.app
    const toAddress = email.to.toLowerCase();
    const uniqueIdMatch = toAddress.match(/task\+([a-z0-9]+)@/) ||
                          toAddress.match(/([a-z0-9]+)@task\./);

    if (!uniqueIdMatch) {
      console.log("Invalid task email address:", email.to);
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const uniqueId = uniqueIdMatch[1];

    // Find user by email unique ID
    const { data: userPref, error: userError } = await supabase
      .from("zeroed_user_preferences")
      .select("user_id")
      .eq("email_task_id", uniqueId)
      .single();

    if (userError || !userPref) {
      console.log("User not found for email ID:", uniqueId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's default list (Inbox)
    const { data: lists } = await supabase
      .from("zeroed_lists")
      .select("id")
      .eq("user_id", userPref.user_id)
      .eq("name", "Inbox")
      .single();

    const listId = lists?.id;

    if (!listId) {
      console.log("No Inbox list found for user");
      return NextResponse.json({ error: "No inbox found" }, { status: 400 });
    }

    // Parse the email to create task
    const taskTitle = email.subject || "Email task";
    const taskNotes = email.text || "";

    // Try to parse natural language from subject
    const parsed = parseNaturalLanguageTask(taskTitle);

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from("zeroed_tasks")
      .insert({
        user_id: userPref.user_id,
        list_id: listId,
        title: parsed.title || taskTitle,
        notes: taskNotes.slice(0, 5000), // Limit notes length
        status: "pending",
        priority: parsed.priority || "normal",
        due_date: parsed.dueDate || null,
        due_time: parsed.dueTime || null,
        estimated_minutes: parsed.estimatedMinutes || 30,
        position: 0,
        source: "email",
      })
      .select()
      .single();

    if (taskError) {
      console.error("Failed to create task:", taskError);
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    // Log the email task creation
    await supabase.from("zeroed_email_logs").insert({
      user_id: userPref.user_id,
      task_id: task.id,
      from_email: email.from,
      subject: email.subject,
      processed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      taskId: task.id,
      title: task.title,
    });
  } catch (error) {
    console.error("Inbound email error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

// Health check for email services
export async function GET() {
  return NextResponse.json({ status: "ok", service: "email-to-task" });
}
