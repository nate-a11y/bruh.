"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { CalendarView, CalendarViewMode } from "@/components/calendar/calendar-view";
import { TimeBlockCalendar } from "@/components/calendar/time-block-calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TaskForm } from "@/components/tasks/task-form";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import type { Task, List } from "@/lib/supabase/types";

type ViewType = CalendarViewMode | "timeblock";

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<Pick<List, "id" | "name">[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewType>("week");
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function fetchTasks() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const [{ data }, { data: listData }] = await Promise.all([
      supabase
        .from("zeroed_tasks")
        .select("*, zeroed_lists(name, color)")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("due_date", { ascending: true }),
      supabase
        .from("zeroed_lists")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("position", { ascending: true }),
    ]);

    setTasks(data || []);
    setLists(listData || []);
    setLoading(false);
  }

  function closeTaskDialog() {
    setEditingTask(null);
    setAddOpen(false);
    fetchTasks();
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function handleTaskUpdate(taskId: string, updates: { due_date?: string; due_time?: string }) {
    const supabase = createClient();
    const { error } = await supabase
      .from("zeroed_tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      return;
    }

    toast.success("Task scheduled");
    fetchTasks();
  }

  async function handleAutoSchedule(taskId: string) {
    try {
      const res = await fetch("/api/tasks/auto-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.scheduled?.[0]?.reasoning || "Task scheduled!");
      fetchTasks();
    } catch (error) {
      toast.error("Failed to auto-schedule");
    }
  }

  function handleTaskClick(task: Task) {
    setEditingTask(task);
  }

  function handleAddTask(_date: Date) {
    setAddOpen(true);
  }

  const getHeaderTitle = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE, MMMM d");
      case "week":
        return "Week View";
      case "month":
        return format(currentDate, "MMMM yyyy");
      case "agenda":
        return "Agenda";
      case "timeblock":
        return "Time Blocking";
      default:
        return "Calendar";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Calendar" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={getHeaderTitle()}
        action={
          <Button
            variant={viewMode === "timeblock" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode(viewMode === "timeblock" ? "week" : "timeblock")}
          >
            <Clock className="h-4 w-4 mr-1" />
            Time Block
          </Button>
        }
      />
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        {viewMode === "timeblock" ? (
          <TimeBlockCalendar
            tasks={tasks}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onTaskUpdate={handleTaskUpdate}
            onAutoSchedule={handleAutoSchedule}
          />
        ) : (
          <CalendarView
            tasks={tasks}
            currentDate={currentDate}
            viewMode={viewMode as CalendarViewMode}
            onDateChange={setCurrentDate}
            onViewModeChange={(mode) => setViewMode(mode)}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        )}
      </div>

      <Dialog
        open={!!editingTask || addOpen}
        onOpenChange={(open) => {
          if (!open) closeTaskDialog();
        }}
      >
        <DialogContent>
          <DialogTitle>{editingTask ? "Edit task" : "New task"}</DialogTitle>
          <TaskForm
            lists={lists}
            defaultListId={lists[0]?.id}
            task={editingTask ?? undefined}
            onClose={closeTaskDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
