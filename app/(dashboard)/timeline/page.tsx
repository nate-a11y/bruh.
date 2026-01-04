import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { TimelineView } from "@/components/timeline/timeline-view";
import { TimelineClient } from "./timeline-client";

export default async function TimelinePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch tasks with their lists
  const { data: tasks } = await supabase
    .from("zeroed_tasks")
    .select(`
      id,
      title,
      due_date,
      estimated_minutes,
      status,
      priority,
      list_id,
      zeroed_lists(name, color)
    `)
    .eq("user_id", user.id)
    .in("status", ["pending", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false });

  // Fetch dependencies
  const { data: dependencies } = await (supabase as any)
    .from("zeroed_task_dependencies")
    .select("task_id, depends_on_id")
    .in(
      "task_id",
      tasks?.map((t) => t.id) || []
    );

  // Map dependencies to tasks
  const dependencyMap: Record<string, string[]> = {};
  dependencies?.forEach((dep: any) => {
    if (!dependencyMap[dep.task_id]) {
      dependencyMap[dep.task_id] = [];
    }
    dependencyMap[dep.task_id].push(dep.depends_on_id);
  });

  const formattedTasks = tasks?.map((task: any) => ({
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    estimated_minutes: task.estimated_minutes,
    status: task.status,
    priority: task.priority,
    list_name: task.zeroed_lists?.name,
    list_color: task.zeroed_lists?.color,
    dependencies: dependencyMap[task.id] || [],
  })) || [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Timeline" />

      <div className="flex-1 p-6">
        <TimelineClient tasks={formattedTasks} />
      </div>
    </div>
  );
}
