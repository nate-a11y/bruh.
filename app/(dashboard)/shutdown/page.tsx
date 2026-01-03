import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShutdownFlow } from "@/components/planning/shutdown-flow";

export default async function ShutdownPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  // Get today's completed tasks
  const { data: completedTasks } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(id, name, color)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("completed_at", `${today}T00:00:00`)
    .order("completed_at", { ascending: false });

  // Get incomplete tasks
  const { data: incompleteTasks } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(id, name, color)")
    .eq("user_id", user.id)
    .eq("due_date", today)
    .neq("status", "completed");

  // Get today's stats
  const { data: todayStats } = await supabase
    .from("zeroed_daily_stats")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  // Get user's intention
  const { data: prefs } = await supabase
    .from("zeroed_user_preferences")
    .select("daily_intention")
    .eq("user_id", user.id)
    .single();

  return (
    <ShutdownFlow
      completedTasks={completedTasks || []}
      incompleteTasks={incompleteTasks || []}
      todayStats={todayStats}
      dailyIntention={prefs?.daily_intention || null}
    />
  );
}
