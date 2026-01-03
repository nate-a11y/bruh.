import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { TaskList } from "@/components/tasks/task-list";

interface ListPageProps {
  params: Promise<{ listId: string }>;
}

export default async function ListPage({ params }: ListPageProps) {
  const { listId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch the list
  const { data: list } = await supabase
    .from("zeroed_lists")
    .select("*")
    .eq("id", listId)
    .eq("user_id", user.id)
    .single();

  if (!list) {
    notFound();
  }

  // Fetch tasks for this list
  const { data: tasks } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(name, color)")
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("status", { ascending: true })
    .order("position", { ascending: true });

  // Fetch all lists for the task form
  const { data: allLists } = await supabase
    .from("zeroed_lists")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("position", { ascending: true });

  return (
    <div className="flex flex-col h-full">
      <Header title={list.name} />

      <div className="flex-1 overflow-auto p-6">
        <TaskList
          tasks={tasks || []}
          lists={allLists || []}
          defaultListId={listId}
          emptyMessage="No tasks in this list yet. Add your first task!"
        />
      </div>
    </div>
  );
}
