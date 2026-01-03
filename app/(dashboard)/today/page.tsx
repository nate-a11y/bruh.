import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { TaskList } from "@/components/tasks/task-list";
import { QuickCaptureBar } from "@/components/tasks/quick-capture-bar";
import { TodayExtras } from "@/components/dashboard/today-extras";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, CheckCircle2, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { getEmptyState } from "@/lib/copy/empty-states";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch today's tasks
  const { data: todayTasks } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(name, color)")
    .eq("user_id", user.id)
    .eq("due_date", today)
    .neq("status", "cancelled")
    .order("status", { ascending: true })
    .order("position", { ascending: true });

  // Fetch pending tasks without due date (inbox)
  const { data: pendingTasks } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(name, color)")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .is("due_date", null)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch today's stats
  const { data: todayStats } = await supabase
    .from("zeroed_daily_stats")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  // Calculate stats
  const completedToday =
    todayTasks?.filter((t) => t.status === "completed").length || 0;
  const totalToday = todayTasks?.length || 0;
  const focusMinutes = todayStats?.focus_minutes || 0;

  // Fetch user's lists for task creation
  const { data: lists } = await supabase
    .from("zeroed_lists")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("position", { ascending: true });

  // Fetch user preferences for display name
  const { data: prefs } = await supabase
    .from("zeroed_user_preferences")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  // Get default list (Inbox or first list)
  const inboxList = lists?.find((l) => l.name === "Inbox") || lists?.[0];

  // Build greeting with name
  const displayName = (prefs as { display_name?: string | null } | null)?.display_name;
  const greeting = displayName
    ? `Hey ${displayName} — ${format(new Date(), "EEEE, MMMM d")}`
    : `Today — ${format(new Date(), "EEEE, MMMM d")}`;

  // Separate completed tasks for ritual
  const completedTasksList = todayTasks?.filter((t) => t.status === "completed") || [];
  const pendingTasksList = todayTasks?.filter((t) => t.status !== "completed") || [];

  return (
    <div className="flex flex-col h-full">
      <Header title={greeting} />

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Planning Rituals & Smart Suggestions */}
        <TodayExtras
          todayTasks={pendingTasksList}
          completedTasks={completedTasksList}
        />

        {/* Quick Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tasks Completed
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {completedToday}/{totalToday}
              </div>
              <p className="text-xs text-muted-foreground">today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Focus Time</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(focusMinutes / 60)}h {focusMinutes % 60}m
              </div>
              <p className="text-xs text-muted-foreground">today</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1 cursor-pointer hover:bg-muted/50 transition-colors">
            <Link href="/focus" className="block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Start Focus
                </CardTitle>
                <Timer className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="sm">
                  Begin Session
                </Button>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Quick Capture */}
        {inboxList && lists && (
          <div className="mb-6">
            <QuickCaptureBar
              lists={lists}
              defaultListId={inboxList.id}
              placeholder="Quick add a task for today... (press Enter)"
            />
          </div>
        )}

        {/* Today's Tasks */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Today&apos;s Tasks</h2>
            {todayTasks?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">{getEmptyState('today')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add something above. Or don&apos;t. We&apos;re not your mom.
                  </p>
                  <Link href="/lists">
                    <Button variant="outline" size="sm">
                      Check Lists
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <TaskList
                tasks={todayTasks || []}
                lists={lists || []}
                showAddButton={false}
              />
            )}
          </div>

          {/* Inbox / Pending Tasks */}
          {pendingTasks && pendingTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Inbox</h2>
              <TaskList
                tasks={pendingTasks}
                lists={lists || []}
                showAddButton={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
