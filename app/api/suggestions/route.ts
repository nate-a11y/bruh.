import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format, subDays, parseISO, isToday, isTomorrow } from "date-fns";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions: any[] = [];
    const today = format(new Date(), "yyyy-MM-dd");
    const hour = new Date().getHours();

    // Check for overdue tasks
    const { data: overdueTasks } = await supabase
      .from("zeroed_tasks")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lt("due_date", today)
      .limit(3);

    if (overdueTasks && overdueTasks.length > 0) {
      suggestions.push({
        id: "overdue",
        type: "task",
        title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
        description: overdueTasks.map(t => t.title).join(", ").slice(0, 100),
        confidence: 0.9,
      });
    }

    // Check for high priority tasks not scheduled
    const { data: highPriorityTasks } = await supabase
      .from("zeroed_tasks")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .in("priority", ["urgent", "high"])
      .is("due_date", null)
      .limit(3);

    if (highPriorityTasks && highPriorityTasks.length > 0) {
      suggestions.push({
        id: "schedule-high",
        type: "time",
        title: "High priority tasks need scheduling",
        description: `${highPriorityTasks.length} important task${highPriorityTasks.length > 1 ? "s" : ""} without due dates`,
        confidence: 0.8,
      });
    }

    // Best focus time suggestion based on time of day
    if (hour >= 9 && hour <= 11) {
      const { count } = await supabase
        .from("zeroed_tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("due_date", today)
        .eq("status", "pending");

      if (count && count > 0) {
        suggestions.push({
          id: "morning-focus",
          type: "insight",
          title: "Peak focus time",
          description: "Mornings are typically best for deep work. Start a focus session?",
          action: {
            type: "start_focus",
            payload: {},
          },
          confidence: 0.7,
        });
      }
    }

    // Check incomplete habits
    const { data: habits } = await supabase
      .from("zeroed_habits")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .limit(5);

    const { data: todayHabitLogs } = await supabase
      .from("zeroed_habit_logs")
      .select("habit_id")
      .eq("user_id", user.id)
      .eq("date", today);

    const completedHabitIds = new Set(todayHabitLogs?.map(l => l.habit_id) || []);
    const incompleteHabits = habits?.filter(h => !completedHabitIds.has(h.id)) || [];

    if (incompleteHabits.length > 0 && hour >= 18) {
      suggestions.push({
        id: "habits",
        type: "habit",
        title: `${incompleteHabits.length} habit${incompleteHabits.length > 1 ? "s" : ""} incomplete`,
        description: incompleteHabits.slice(0, 3).map(h => h.name).join(", "),
        confidence: 0.75,
      });
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggestions error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
