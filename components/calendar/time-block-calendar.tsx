"use client";

import { useState, useRef, useCallback } from "react";
import {
  format,
  addDays,
  startOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
  setHours,
  setMinutes,
} from "date-fns";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  Sparkles,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/supabase/types";

interface TimeBlockCalendarProps {
  tasks: Task[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onTaskUpdate: (taskId: string, updates: { due_date?: string; due_time?: string }) => Promise<void>;
  onAutoSchedule?: (taskId: string) => Promise<void>;
  workHoursStart?: number; // Default 9
  workHoursEnd?: number; // Default 18
}

const HOUR_HEIGHT = 60; // pixels per hour
const SLOT_DURATION = 30; // minutes per slot

export function TimeBlockCalendar({
  tasks,
  currentDate,
  onDateChange,
  onTaskUpdate,
  onAutoSchedule,
  workHoursStart = 9,
  workHoursEnd = 18,
}: TimeBlockCalendarProps) {
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; time: string } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Get week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  // Generate time slots (work hours)
  const timeSlots: string[] = [];
  for (let hour = workHoursStart; hour < workHoursEnd; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
  }

  // Get unscheduled tasks (no due_time)
  const unscheduledTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled" && !t.due_time
  );

  // Get scheduled tasks by day and time
  const getTasksForSlot = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasks.filter((t) => {
      if (!t.due_date || !t.due_time) return false;
      return t.due_date === dateStr && t.due_time.startsWith(time.slice(0, 5));
    });
  };

  // Calculate task position and height based on time and duration
  const getTaskStyle = (task: Task) => {
    if (!task.due_time) return {};
    const [hours, minutes] = task.due_time.split(":").map(Number);
    const startMinutes = (hours - workHoursStart) * 60 + minutes;
    const duration = task.estimated_minutes || 30;
    return {
      top: `${(startMinutes / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max((duration / 60) * HOUR_HEIGHT - 4, 24)}px`,
    };
  };

  // Drag handlers
  const handleDragStart = (task: Task) => {
    setDraggingTask(task);
  };

  const handleDragOver = (e: React.DragEvent, date: Date, time: string) => {
    e.preventDefault();
    setDropTarget({ date: format(date, "yyyy-MM-dd"), time });
  };

  const handleDrop = async (e: React.DragEvent, date: Date, time: string) => {
    e.preventDefault();
    if (!draggingTask) return;

    await onTaskUpdate(draggingTask.id, {
      due_date: format(date, "yyyy-MM-dd"),
      due_time: time,
    });

    setDraggingTask(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggingTask(null);
    setDropTarget(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(addDays(currentDate, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(addDays(currentDate, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(new Date())}
            className="ml-2"
          >
            Today
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-4">
        {/* Unscheduled Tasks Sidebar */}
        <div className="w-64 flex-shrink-0 border rounded-lg p-3 overflow-y-auto">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Unscheduled
            <Badge variant="secondary" className="ml-auto">
              {unscheduledTasks.length}
            </Badge>
          </h3>
          <div className="space-y-2">
            {unscheduledTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(task)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "p-2 rounded border cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors",
                  "border-l-4",
                  task.priority === "urgent" && "border-l-red-500",
                  task.priority === "high" && "border-l-orange-500",
                  task.priority === "normal" && "border-l-blue-500",
                  task.priority === "low" && "border-l-gray-400"
                )}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.estimated_minutes && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {task.estimated_minutes}m
                      </p>
                    )}
                  </div>
                  {onAutoSchedule && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAutoSchedule(task.id);
                      }}
                      title="AI Schedule"
                    >
                      <Sparkles className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {unscheduledTasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                All tasks scheduled!
              </p>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto border rounded-lg" ref={calendarRef}>
          <div className="min-w-[700px]">
            {/* Day Headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 bg-background z-10 border-b">
              <div className="p-2 text-center text-xs text-muted-foreground" />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "p-2 text-center border-l",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={cn(
                      "text-lg font-semibold",
                      isToday(day) &&
                        "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)]">
              {/* Time Labels */}
              <div>
                {timeSlots
                  .filter((t) => t.endsWith(":00"))
                  .map((time) => (
                    <div
                      key={time}
                      className="h-[60px] border-b text-xs text-muted-foreground text-right pr-2 pt-1"
                    >
                      {time}
                    </div>
                  ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="relative border-l">
                  {/* Time slots */}
                  {timeSlots.map((time, idx) => {
                    const isHour = time.endsWith(":00");
                    const isDropHere =
                      dropTarget?.date === format(day, "yyyy-MM-dd") &&
                      dropTarget?.time === time;
                    return (
                      <div
                        key={time}
                        className={cn(
                          "h-[30px]",
                          isHour && "border-t",
                          !isHour && "border-t border-dashed border-muted",
                          isDropHere && "bg-primary/20"
                        )}
                        onDragOver={(e) => handleDragOver(e, day, time)}
                        onDrop={(e) => handleDrop(e, day, time)}
                      />
                    );
                  })}

                  {/* Scheduled Tasks */}
                  <div className="absolute inset-0 pointer-events-none">
                    {tasks
                      .filter(
                        (t) =>
                          t.due_date === format(day, "yyyy-MM-dd") &&
                          t.due_time &&
                          t.status !== "completed" &&
                          t.status !== "cancelled"
                      )
                      .map((task) => (
                        <motion.div
                          key={task.id}
                          layoutId={task.id}
                          className={cn(
                            "absolute left-1 right-1 rounded px-2 py-1 pointer-events-auto cursor-grab active:cursor-grabbing overflow-hidden",
                            task.priority === "urgent" && "bg-red-500/90 text-white",
                            task.priority === "high" && "bg-orange-500/90 text-white",
                            task.priority === "normal" && "bg-blue-500/90 text-white",
                            task.priority === "low" && "bg-gray-500/90 text-white"
                          )}
                          style={getTaskStyle(task)}
                          draggable
                          onDragStart={() => handleDragStart(task)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="text-xs font-medium truncate">
                            {task.title}
                          </div>
                          {task.estimated_minutes && task.estimated_minutes > 30 && (
                            <div className="text-[10px] opacity-80 flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {task.estimated_minutes}m
                            </div>
                          )}
                        </motion.div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
