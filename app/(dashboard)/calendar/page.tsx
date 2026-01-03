"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { CalendarView, CalendarViewMode } from "@/components/calendar/calendar-view";
import type { Task } from "@/lib/supabase/types";

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch all tasks with due dates for the calendar
      const { data } = await supabase
        .from("zeroed_tasks")
        .select("*, zeroed_lists(name, color)")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });

      setTasks(data || []);
      setLoading(false);
    }

    fetchTasks();
  }, []);

  function handleTaskClick(task: Task) {
    // Navigate to task detail or open edit modal
    // For now, we'll just log it
    console.log("Task clicked:", task);
  }

  function handleAddTask(date: Date) {
    // Could open a quick-add modal with the date pre-filled
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
      <Header title={getHeaderTitle()} />
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <CalendarView
          tasks={tasks}
          currentDate={currentDate}
          viewMode={viewMode}
          onDateChange={setCurrentDate}
          onViewModeChange={setViewMode}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
        />
      </div>
    </div>
  );
}
