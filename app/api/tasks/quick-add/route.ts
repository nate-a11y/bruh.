import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseNaturalLanguageTask } from "@/lib/utils/natural-language-parser";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, notes, priority, due_date, source } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Parse natural language from title
    const parsed = parseNaturalLanguageTask(title);

    // Get user's Inbox list
    const { data: inbox } = await supabase
      .from("zeroed_lists")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "Inbox")
      .single();

    if (!inbox) {
      return NextResponse.json({ error: "Inbox not found" }, { status: 400 });
    }

    // Create the task
    const { data: task, error } = await supabase
      .from("zeroed_tasks")
      .insert({
        user_id: user.id,
        list_id: inbox.id,
        title: parsed.title || title.trim(),
        notes: notes || null,
        priority: priority || parsed.priority || "normal",
        due_date: due_date || parsed.dueDate || null,
        due_time: parsed.dueTime || null,
        estimated_minutes: parsed.estimatedMinutes || 30,
        status: "pending",
        position: 0,
        source: source || "quick-add",
      })
      .select()
      .single();

    if (error) {
      console.error("Task creation error:", error);
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        priority: task.priority,
        due_date: task.due_date,
      }
    });
  } catch (error) {
    console.error("Quick add error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
