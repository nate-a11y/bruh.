"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  differenceInDays,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Link,
  AlertCircle,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TimelineTask {
  id: string;
  title: string;
  due_date: string | null;
  start_date?: string | null;
  estimated_minutes: number;
  status: string;
  priority: string;
  list_name?: string;
  list_color?: string;
  dependencies?: string[];
  blocking?: string[];
}

interface TimelineViewProps {
  tasks: TimelineTask[];
  onTaskClick?: (taskId: string) => void;
  onDateChange?: (taskId: string, newDate: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  normal: "bg-blue-500",
  low: "bg-slate-400",
};

export function TimelineView({
  tasks,
  onTaskClick,
  onDateChange,
}: TimelineViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  // Calculate the week range
  const weekStart = useMemo(() => {
    const today = new Date();
    return startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 }); // Monday start
  }, [weekOffset]);

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Group tasks by their date position
  const tasksByDate = useMemo(() => {
    const map: Record<string, TimelineTask[]> = {};

    tasks.forEach((task) => {
      if (task.due_date) {
        const dateKey = task.due_date;
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey].push(task);
      }
    });

    return map;
  }, [tasks]);

  // Tasks without dates
  const unscheduledTasks = useMemo(() => {
    return tasks.filter((t) => !t.due_date);
  }, [tasks]);

  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTask(taskId);
  }

  function handleDragEnd() {
    setDraggedTask(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, date: Date) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId && onDateChange) {
      onDateChange(taskId, format(date, "yyyy-MM-dd"));
    }
    setDraggedTask(null);
  }

  const today = startOfDay(new Date());

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Timeline</h2>
          <Badge variant="secondary" className="ml-2">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 13), "MMM d, yyyy")}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
          <div className="grid grid-cols-14 border-b sticky top-0 bg-background z-10">
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                  key={i}
                  className={cn(
                    "p-2 text-center border-r last:border-r-0",
                    isToday && "bg-primary/10",
                    isWeekend && "bg-muted/50"
                  )}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isToday && "text-primary"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Task rows */}
          <div className="relative min-h-[300px]">
            {/* Day columns for drop targets */}
            <div className="grid grid-cols-14 absolute inset-0">
              {days.map((day, i) => {
                const isToday = isSameDay(day, today);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const dateKey = format(day, "yyyy-MM-dd");
                const dayTasks = tasksByDate[dateKey] || [];

                return (
                  <div
                    key={i}
                    className={cn(
                      "border-r last:border-r-0 p-1",
                      isToday && "bg-primary/5",
                      isWeekend && "bg-muted/30",
                      draggedTask && "hover:bg-primary/10"
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day)}
                  >
                    <div className="space-y-1">
                      {dayTasks.map((task) => (
                        <TooltipProvider key={task.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => onTaskClick?.(task.id)}
                                className={cn(
                                  "group relative p-1.5 rounded text-xs cursor-pointer transition-all",
                                  "hover:ring-2 hover:ring-primary/50",
                                  task.status === "completed" && "opacity-50",
                                  draggedTask === task.id && "opacity-50 ring-2 ring-primary"
                                )}
                                style={{
                                  backgroundColor: task.list_color
                                    ? `${task.list_color}20`
                                    : undefined,
                                  borderLeft: `3px solid ${task.list_color || "#888"}`,
                                }}
                              >
                                <div className="flex items-start gap-1">
                                  <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 cursor-grab" />
                                  <span className="truncate flex-1">
                                    {task.title}
                                  </span>
                                </div>

                                {/* Priority indicator */}
                                <div
                                  className={cn(
                                    "absolute top-1 right-1 w-2 h-2 rounded-full",
                                    PRIORITY_COLORS[task.priority]
                                  )}
                                />

                                {/* Dependencies indicator */}
                                {task.dependencies && task.dependencies.length > 0 && (
                                  <div className="absolute bottom-1 right-1">
                                    <Link className="h-3 w-3 text-amber-500" />
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <div className="font-medium">{task.title}</div>
                                {task.list_name && (
                                  <div className="text-xs text-muted-foreground">
                                    {task.list_name}
                                  </div>
                                )}
                                <div className="text-xs">
                                  {task.estimated_minutes} min • {task.priority}
                                </div>
                                {task.dependencies && task.dependencies.length > 0 && (
                                  <div className="text-xs text-amber-500 flex items-center gap-1">
                                    <Link className="h-3 w-3" />
                                    Blocked by {task.dependencies.length} task(s)
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unscheduled tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="border-t p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Unscheduled ({unscheduledTasks.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unscheduledTasks.slice(0, 10).map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                onClick={() => onTaskClick?.(task.id)}
                className={cn(
                  "px-2 py-1 rounded text-xs border cursor-pointer hover:bg-muted",
                  draggedTask === task.id && "opacity-50"
                )}
                style={{
                  borderLeftColor: task.list_color || "#888",
                  borderLeftWidth: 3,
                }}
              >
                {task.title}
              </div>
            ))}
            {unscheduledTasks.length > 10 && (
              <span className="text-xs text-muted-foreground px-2 py-1">
                +{unscheduledTasks.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
