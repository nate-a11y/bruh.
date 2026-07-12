"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarDay } from "./calendar-day";
import type { TaskWithRelations } from "@/lib/supabase/types";

interface CalendarViewProps {
  tasks: TaskWithRelations[];
  onTaskClick?: (task: TaskWithRelations) => void;
  onDayClick?: (date: Date) => void;
}

export function CalendarView({ tasks, onTaskClick, onDayClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const byDate: Record<string, TaskWithRelations[]> = {};
    tasks.forEach(task => {
      if (task.due_date) {
        const key = format(new Date(task.due_date), "yyyy-MM-dd");
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(task);
      }
    });
    return byDate;
  }, [tasks]);

  return (
    <div className="bg-card rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
        <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 border-b">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <CalendarDay
              key={index}
              date={day}
              tasks={dayTasks}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday(day)}
              onTaskClick={onTaskClick}
              onDayClick={() => onDayClick?.(day)}
            />
          );
        })}
      </div>
    </div>
  );
}
