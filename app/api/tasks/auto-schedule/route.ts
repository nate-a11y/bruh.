import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findOptimalTimeSlot } from "@/lib/ai/auto-schedule";
import { format, parseISO } from "date-fns";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskId, taskIds } = await request.json();

    // Handle single task or multiple tasks
    const idsToSchedule = taskIds || [taskId];

    // Get tasks to schedule
    const { data: tasks, error: tasksError } = await supabase
      .from("zeroed_tasks")
      .select("id, title, estimated_minutes, due_date, priority")
      .eq("user_id", user.id)
      .in("id", idsToSchedule)
      .neq("status", "completed")
      .neq("status", "cancelled");

    if (tasksError || !tasks?.length) {
      return NextResponse.json({ error: "Tasks not found" }, { status: 404 });
    }

    // Get existing scheduled tasks and calendar events for the next 14 days
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: existingTasks } = await supabase
      .from("zeroed_tasks")
      .select("due_date, due_time, estimated_minutes, title")
      .eq("user_id", user.id)
      .gte("due_date", today)
      .not("due_time", "is", null)
      .neq("status", "completed")
      .neq("status", "cancelled");

    // Build existing events by day
    const existingEventsByDay: Record<string, { start_time: string; end_time: string; title: string }[]> = {};

    existingTasks?.forEach((task) => {
      if (!task.due_date || !task.due_time) return;

      if (!existingEventsByDay[task.due_date]) {
        existingEventsByDay[task.due_date] = [];
      }

      const startMinutes =
        parseInt(task.due_time.split(":")[0]) * 60 +
        parseInt(task.due_time.split(":")[1]);
      const endMinutes = startMinutes + (task.estimated_minutes || 30);

      existingEventsByDay[task.due_date].push({
        start_time: task.due_time,
        end_time: `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`,
        title: task.title,
      });
    });

    // Schedule each task
    const results = [];
    const errors = [];

    for (const task of tasks) {
      const slot = await findOptimalTimeSlot(
        {
          id: task.id,
          title: task.title,
          estimated_minutes: task.estimated_minutes || 30,
          due_date: task.due_date,
          priority: task.priority,
        },
        existingEventsByDay
      );

      if (slot) {
        // Update the task with the scheduled time
        const { error: updateError } = await supabase
          .from("zeroed_tasks")
          .update({
            due_date: slot.date,
            due_time: slot.time,
          })
          .eq("id", task.id);

        if (updateError) {
          errors.push({ taskId: task.id, error: updateError.message });
        } else {
          results.push({
            taskId: task.id,
            title: task.title,
            date: slot.date,
            time: slot.time,
            reasoning: slot.reasoning,
          });

          // Add to existing events for next iteration
          if (!existingEventsByDay[slot.date]) {
            existingEventsByDay[slot.date] = [];
          }
          const endMinutes =
            parseInt(slot.time.split(":")[0]) * 60 +
            parseInt(slot.time.split(":")[1]) +
            (task.estimated_minutes || 30);
          existingEventsByDay[slot.date].push({
            start_time: slot.time,
            end_time: `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`,
            title: task.title,
          });
        }
      } else {
        errors.push({ taskId: task.id, error: "No available slots found" });
      }
    }

    return NextResponse.json({
      scheduled: results,
      errors,
      message: `Scheduled ${results.length} task${results.length === 1 ? "" : "s"}${errors.length > 0 ? `, ${errors.length} failed` : ""}`,
    });
  } catch (error) {
    console.error("Auto-schedule error:", error);
    return NextResponse.json({ error: "Scheduling failed" }, { status: 500 });
  }
}
