"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskItem } from "./task-item";
import { TaskForm } from "./task-form";
import { BulkActions } from "./bulk-actions";
import type { Task, List } from "@/lib/supabase/types";

interface TaskListProps {
  tasks: (Task & { zeroed_lists?: { name: string; color: string } | null })[];
  lists: Pick<List, "id" | "name">[];
  defaultListId?: string;
  emptyMessage?: string;
  showAddButton?: boolean;
  enableSelection?: boolean;
}

export function TaskList({
  tasks,
  lists,
  defaultListId,
  emptyMessage = "No tasks yet",
  showAddButton = true,
  enableSelection = true,
}: TaskListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Clear selection when tasks change
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => tasks.some((t) => t.id === id)));
  }, [tasks]);

  // Keyboard shortcut for select all
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "a" && enableSelection) {
        e.preventDefault();
        if (selectedIds.length === tasks.length) {
          setSelectedIds([]);
        } else {
          setSelectedIds(tasks.map((t) => t.id));
        }
      }
      if (e.key === "Escape") {
        setSelectedIds([]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tasks, selectedIds, enableSelection]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === tasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tasks.map((t) => t.id));
    }
  };

  return (
    <div className="space-y-3">
      {/* Bulk Actions Bar */}
      {enableSelection && selectedIds.length > 0 && (
        <BulkActions
          selectedIds={selectedIds}
          lists={lists as List[]}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      {/* Select All (when tasks exist) */}
      {enableSelection && tasks.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={selectedIds.length === tasks.length && tasks.length > 0}
            onCheckedChange={selectAll}
          />
          <span>
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : "Select all"}
          </span>
        </div>
      )}

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
            <div key={task.id} className="flex items-start gap-2">
              {enableSelection && (
                <Checkbox
                  checked={selectedIds.includes(task.id)}
                  onCheckedChange={() => toggleSelection(task.id)}
                  className="mt-4"
                />
              )}
              <div className="flex-1">
                <TaskItem
                  task={task}
                  onEdit={(t) => setEditingTask(t)}
                />
              </div>
            </div>
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
