"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  isTomorrow,
  isPast,
  parseISO,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  LayoutGrid,
  Plus,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/supabase/types";

export type CalendarViewMode = "day" | "week" | "month" | "agenda";

interface CalendarViewProps {
  tasks: Task[];
  currentDate: Date;
  viewMode: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (date: Date) => void;
}

const VIEW_OPTIONS: { value: CalendarViewMode; label: string; icon: React.ReactNode }[] = [
  { value: "day", label: "Day", icon: <Calendar className="h-4 w-4" /> },
  { value: "week", label: "Week", icon: <LayoutGrid className="h-4 w-4" /> },
  { value: "month", label: "Month", icon: <Calendar className="h-4 w-4" /> },
  { value: "agenda", label: "Agenda", icon: <List className="h-4 w-4" /> },
];

export function CalendarView({
  tasks,
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onTaskClick,
  onAddTask,
}: CalendarViewProps) {
  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (task.due_date) {
        const key = task.due_date;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  function navigate(direction: "prev" | "next") {
    if (viewMode === "month") {
      onDateChange(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      onDateChange(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      const days = direction === "prev" ? -1 : 1;
      onDateChange(new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000));
    }
  }

  function getHeaderTitle() {
    if (viewMode === "month") {
      return format(currentDate, "MMMM yyyy");
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    } else if (viewMode === "agenda") {
      return "Upcoming";
    } else {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">{getHeaderTitle()}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(new Date())}
            className="ml-2"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {VIEW_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={viewMode === option.value ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange(option.value)}
              className="gap-1"
            >
              {option.icon}
              <span className="hidden sm:inline">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {viewMode === "day" && (
            <DayView
              key="day"
              date={currentDate}
              tasks={tasksByDate[format(currentDate, "yyyy-MM-dd")] || []}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
            />
          )}
          {viewMode === "week" && (
            <WeekView
              key="week"
              currentDate={currentDate}
              tasksByDate={tasksByDate}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
              onDateClick={onDateChange}
            />
          )}
          {viewMode === "month" && (
            <MonthView
              key="month"
              currentDate={currentDate}
              tasksByDate={tasksByDate}
              onTaskClick={onTaskClick}
              onDateClick={onDateChange}
            />
          )}
          {viewMode === "agenda" && (
            <AgendaView
              key="agenda"
              tasks={tasks}
              onTaskClick={onTaskClick}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Day View Component
function DayView({
  date,
  tasks,
  onTaskClick,
  onAddTask,
}: {
  date: Date;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (date: Date) => void;
}) {
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Sort by time, then by priority
      if (a.due_time && b.due_time) {
        return a.due_time.localeCompare(b.due_time);
      }
      if (a.due_time) return -1;
      if (b.due_time) return 1;
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    });
  }, [tasks]);

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalEstimate = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* Day Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{tasks.length} tasks</span>
        <span>{completedCount} completed</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {Math.round(totalEstimate / 60)}h {totalEstimate % 60}m estimated
        </span>
      </div>

      {/* Task List */}
      {sortedTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tasks for this day</p>
          {onAddTask && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => onAddTask(date)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Week View Component
function WeekView({
  currentDate,
  tasksByDate,
  onTaskClick,
  onAddTask,
  onDateClick,
}: {
  currentDate: Date;
  tasksByDate: Record<string, Task[]>;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (date: Date) => void;
  onDateClick?: (date: Date) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="grid grid-cols-7 gap-2 h-full"
    >
      {days.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dayTasks = tasksByDate[dateKey] || [];
        const isCurrentDay = isToday(day);
        const isPastDay = isPast(day) && !isToday(day);

        return (
          <div
            key={dateKey}
            className={cn(
              "flex flex-col rounded-lg border p-2 min-h-[200px]",
              isCurrentDay && "border-primary bg-primary/5",
              isPastDay && "opacity-60"
            )}
          >
            {/* Day Header */}
            <div
              className={cn(
                "text-center pb-2 border-b cursor-pointer hover:bg-muted/50 rounded",
                isCurrentDay && "text-primary font-bold"
              )}
              onClick={() => onDateClick?.(day)}
            >
              <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
              <div className={cn("text-lg", isCurrentDay && "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto")}>
                {format(day, "d")}
              </div>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-auto space-y-1 mt-2">
              {dayTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "text-xs p-1.5 rounded cursor-pointer hover:bg-muted transition-colors truncate",
                    task.status === "completed" && "line-through opacity-50",
                    task.priority === "urgent" && "border-l-2 border-red-500",
                    task.priority === "high" && "border-l-2 border-orange-500"
                  )}
                  onClick={() => onTaskClick?.(task)}
                  title={task.title}
                >
                  {task.due_time && (
                    <span className="text-muted-foreground mr-1">
                      {task.due_time.slice(0, 5)}
                    </span>
                  )}
                  {task.title}
                </div>
              ))}
              {dayTasks.length > 5 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{dayTasks.length - 5} more
                </div>
              )}
            </div>

            {/* Add button */}
            {onAddTask && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-6 mt-1 opacity-0 hover:opacity-100 transition-opacity"
                onClick={() => onAddTask(day)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

// Month View Component
function MonthView({
  currentDate,
  tasksByDate,
  onTaskClick,
  onDateClick,
}: {
  currentDate: Date;
  tasksByDate: Record<string, Task[]>;
  onTaskClick?: (task: Task) => void;
  onDateClick?: (date: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          const hasTasks = dayTasks.length > 0;
          const hasOverdue = dayTasks.some(
            (t) => t.status !== "completed" && isPast(parseISO(t.due_date!))
          );

          return (
            <div
              key={dateKey}
              className={cn(
                "aspect-square p-1 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors relative",
                !isCurrentMonth && "opacity-40",
                isCurrentDay && "bg-primary/10 border border-primary"
              )}
              onClick={() => onDateClick?.(day)}
            >
              <div className={cn(
                "text-sm font-medium text-center",
                isCurrentDay && "text-primary"
              )}>
                {format(day, "d")}
              </div>

              {/* Task indicators */}
              {hasTasks && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayTasks.slice(0, 3).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        hasOverdue ? "bg-red-500" : "bg-primary"
                      )}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{dayTasks.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Agenda View Component
function AgendaView({
  tasks,
  onTaskClick,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}) {
  const groupedTasks = useMemo(() => {
    const today = new Date();
    const groups: { label: string; tasks: Task[] }[] = [
      { label: "Overdue", tasks: [] },
      { label: "Today", tasks: [] },
      { label: "Tomorrow", tasks: [] },
      { label: "This Week", tasks: [] },
      { label: "Later", tasks: [] },
      { label: "No Date", tasks: [] },
    ];

    tasks
      .filter((t) => t.status !== "completed")
      .forEach((task) => {
        if (!task.due_date) {
          groups[5].tasks.push(task);
        } else {
          const dueDate = parseISO(task.due_date);
          if (isPast(dueDate) && !isToday(dueDate)) {
            groups[0].tasks.push(task);
          } else if (isToday(dueDate)) {
            groups[1].tasks.push(task);
          } else if (isTomorrow(dueDate)) {
            groups[2].tasks.push(task);
          } else {
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
            if (dueDate <= weekEnd) {
              groups[3].tasks.push(task);
            } else {
              groups[4].tasks.push(task);
            }
          }
        }
      });

    return groups.filter((g) => g.tasks.length > 0);
  }, [tasks]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {groupedTasks.map((group) => (
        <div key={group.label}>
          <h3 className={cn(
            "text-sm font-semibold mb-2 flex items-center gap-2",
            group.label === "Overdue" && "text-red-500"
          )}>
            {group.label === "Overdue" && <AlertCircle className="h-4 w-4" />}
            {group.label}
            <Badge variant="secondary" className="ml-auto">
              {group.tasks.length}
            </Badge>
          </h3>
          <div className="space-y-2">
            {group.tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} showDate />
            ))}
          </div>
        </div>
      ))}

      {groupedTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>All caught up!</p>
        </div>
      )}
    </motion.div>
  );
}

// Reusable Task Card
function TaskCard({
  task,
  onClick,
  showDate = false,
}: {
  task: Task;
  onClick?: () => void;
  showDate?: boolean;
}) {
  const priorityColors = {
    urgent: "border-l-red-500",
    high: "border-l-orange-500",
    normal: "border-l-blue-500",
    low: "border-l-gray-400",
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-l-4 cursor-pointer hover:bg-muted/50 transition-colors",
        priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.normal,
        task.status === "completed" && "opacity-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium truncate", task.status === "completed" && "line-through")}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {task.due_time && <span>{task.due_time.slice(0, 5)}</span>}
            {showDate && task.due_date && (
              <span>{format(parseISO(task.due_date), "MMM d")}</span>
            )}
            {task.estimated_minutes && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {task.estimated_minutes}m
              </span>
            )}
          </div>
        </div>
        <Badge
          variant={task.priority === "urgent" ? "destructive" : "secondary"}
          className="shrink-0 text-xs"
        >
          {task.priority}
        </Badge>
      </div>
    </div>
  );
}
