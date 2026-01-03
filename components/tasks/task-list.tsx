"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskItem } from "./task-item";
import { TaskForm } from "./task-form";
import type { Task, List } from "@/lib/supabase/types";

interface TaskListProps {
  tasks: (Task & { zeroed_lists?: { name: string; color: string } | null })[];
  lists: Pick<List, "id" | "name">[];
  defaultListId?: string;
  emptyMessage?: string;
  showAddButton?: boolean;
}

export function TaskList({
  tasks,
  lists,
  defaultListId,
  emptyMessage = "No tasks yet",
  showAddButton = true,
}: TaskListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  return (
    <div className="space-y-3">
      {tasks.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
          {showAddButton && lists.length > 0 && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )}
        </div>
      ) : (
        <>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={(t) => setEditingTask(t)}
            />
          ))}

          {showForm || editingTask ? (
            <TaskForm
              lists={lists}
              defaultListId={defaultListId || lists[0]?.id}
              task={editingTask || undefined}
              onClose={() => {
                setShowForm(false);
                setEditingTask(null);
              }}
            />
          ) : (
            showAddButton &&
            lists.length > 0 && (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={() => setShowForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add task
              </Button>
            )
          )}
        </>
      )}
    </div>
  );
}
