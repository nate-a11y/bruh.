import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { StatsOverview } from "@/components/stats/stats-overview";
import { StatsChart } from "@/components/stats/stats-chart";
import { PunctualityReport } from "@/components/stats/punctuality-report";

export default async function StatsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Fetch stats for the last 7 days
  const { data: weekStats } = await supabase
    .from("zeroed_daily_stats")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", format(subDays(today, 6), "yyyy-MM-dd"))
    .lte("date", format(today, "yyyy-MM-dd"))
    .order("date", { ascending: true });

  // Fetch all completed tasks for punctuality analysis
  const { data: completedTasks } = await supabase
    .from("zeroed_tasks")
    .select("estimated_minutes, actual_minutes")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .not("actual_minutes", "eq", 0);

  // Calculate totals
  const weeklyStats = weekStats || [];
  const totalTasksCompleted = weeklyStats.reduce(
    (sum, day) => sum + (day.tasks_completed || 0),
    0
  );
  const totalFocusMinutes = weeklyStats.reduce(
    (sum, day) => sum + (day.focus_minutes || 0),
    0
  );
  const totalSessions = weeklyStats.reduce(
    (sum, day) => sum + (day.sessions_completed || 0),
    0
  );

  // Calculate estimation accuracy
  const tasksWithTime = completedTasks || [];
  const totalEstimated = tasksWithTime.reduce(
    (sum, t) => sum + (t.estimated_minutes || 0),
    0
  );
  const totalActual = tasksWithTime.reduce(
    (sum, t) => sum + (t.actual_minutes || 0),
    0
  );
  const accuracyPercentage =
    totalEstimated > 0
      ? Math.round((1 - Math.abs(totalActual - totalEstimated) / totalEstimated) * 100)
      : 0;

  // Prepare chart data
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const chartData = daysOfWeek.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayStat = weeklyStats.find((s) => s.date === dayStr);
    return {
      date: format(day, "EEE"),
      fullDate: dayStr,
      tasksCompleted: dayStat?.tasks_completed || 0,
      focusMinutes: dayStat?.focus_minutes || 0,
      sessions: dayStat?.sessions_completed || 0,
    };
  });

  // Calculate streak (consecutive days with completed tasks)
  let streak = 0;
  for (let i = 0; i <= 30; i++) {
    const dateStr = format(subDays(today, i), "yyyy-MM-dd");
    const dayStats = weeklyStats.find((s) => s.date === dateStr);
    if (dayStats && dayStats.tasks_completed > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Productivity Stats" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Overview Cards */}
        <StatsOverview
          totalTasksCompleted={totalTasksCompleted}
          totalFocusMinutes={totalFocusMinutes}
          totalSessions={totalSessions}
          streak={streak}
        />

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <StatsChart
            data={chartData}
            title="Tasks Completed"
            dataKey="tasksCompleted"
            color="var(--color-primary)"
          />
          <StatsChart
            data={chartData}
            title="Focus Time (minutes)"
            dataKey="focusMinutes"
            color="var(--color-success)"
          />
        </div>

        {/* Punctuality Report */}
        <PunctualityReport
          accuracyPercentage={Math.max(0, accuracyPercentage)}
          totalEstimated={totalEstimated}
          totalActual={totalActual}
          taskCount={tasksWithTime.length}
        />
      </div>
    </div>
  );
}
