import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DailyPlanningFlow } from "@/components/planning/daily-planning-flow";
import { isToday, parseISO } from "date-fns";

export default async function PlanningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // Get user preferences
  const { data: prefs } = await supabase
    .from("zeroed_user_preferences")
    .select("last_daily_planning_at, daily_intention")
    .eq("user_id", user.id)
    .single();

  // Get yesterday's incomplete tasks
  const { data: carryover } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(id, name, color)")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .lt("due_date", new Date().toISOString().split("T")[0])
    .order("priority", { ascending: false });

  // Get today's tasks
  const today = new Date().toISOString().split("T")[0];
  const { data: todayTasks } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(id, name, color)")
    .eq("user_id", user.id)
    .eq("due_date", today)
    .neq("status", "completed")
    .order("priority", { ascending: false });

  // Get yesterday's stats
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: yesterdayStats } = await supabase
    .from("zeroed_daily_stats")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", yesterday)
    .single();

  const alreadyPlannedToday = prefs?.last_daily_planning_at
    ? isToday(parseISO(prefs.last_daily_planning_at))
    : false;

  return (
    <DailyPlanningFlow
      carryoverTasks={carryover || []}
      todayTasks={todayTasks || []}
      yesterdayStats={yesterdayStats}
      previousIntention={prefs?.daily_intention || null}
      alreadyPlanned={alreadyPlannedToday}
    />
  );
}
