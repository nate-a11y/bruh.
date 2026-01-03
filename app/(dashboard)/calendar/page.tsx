"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { CalendarView, CalendarViewMode } from "@/components/calendar/calendar-view";
import { TimeBlockCalendar } from "@/components/calendar/time-block-calendar";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/supabase/types";

type ViewType = CalendarViewMode | "timeblock";

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewType>("week");
  const [loading, setLoading] = useState(true);

  async function fetchTasks() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("zeroed_tasks")
      .select("*, zeroed_lists(name, color)")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("due_date", { ascending: true });

    setTasks(data || []);
    setLoading(false);
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
    console.log("Task clicked:", task);
  }

  function handleAddTask(date: Date) {
    console.log("Add task for:", format(date, "yyyy-MM-dd"));
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
    </div>
  );
}
