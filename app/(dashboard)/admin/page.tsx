import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { Header } from "@/components/dashboard/header";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect("/today");
  }

  // Fetch admin stats using service role or admin queries
  // For now, we'll fetch what we can with the user's permissions

  // Get total users count (this would need service role in production)
  const { count: totalUsers } = await supabase
    .from("zeroed_user_preferences")
    .select("*", { count: "exact", head: true });

  // Get recent signups (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: recentSignups } = await supabase
    .from("zeroed_user_preferences")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString());

  // Get total tasks
  const { count: totalTasks } = await supabase
    .from("zeroed_tasks")
    .select("*", { count: "exact", head: true });

  // Get completed tasks
  const { count: completedTasks } = await supabase
    .from("zeroed_tasks")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  // Get total teams
  const { count: totalTeams } = await (supabase as any)
    .from("zeroed_teams")
    .select("*", { count: "exact", head: true });

  // Get active focus sessions today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: focusSessionsToday } = await supabase
    .from("zeroed_focus_sessions")
    .select("*", { count: "exact", head: true })
    .gte("started_at", today.toISOString());

  // Fetch recent user activity (users with preferences)
  const { data: recentUsers } = await supabase
    .from("zeroed_user_preferences")
    .select("user_id, display_name, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const stats = {
    totalUsers: totalUsers || 0,
    recentSignups: recentSignups || 0,
    totalTasks: totalTasks || 0,
    completedTasks: completedTasks || 0,
    totalTeams: totalTeams || 0,
    focusSessionsToday: focusSessionsToday || 0,
    completionRate: totalTasks ? Math.round(((completedTasks || 0) / totalTasks) * 100) : 0,
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Admin Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        <AdminDashboard stats={stats} recentUsers={recentUsers || []} />
      </div>
    </div>
  );
}
