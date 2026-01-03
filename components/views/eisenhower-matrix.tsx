"use client";

import { useMemo } from "react";
import { format, isToday, isTomorrow, isPast, addDays, isBefore } from "date-fns";
import { AlertTriangle, Clock, Target, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { completeTask } from "@/app/(dashboard)/actions";
import type { TaskWithRelations } from "@/lib/supabase/types";

interface EisenhowerMatrixProps {
  tasks: TaskWithRelations[];
  onTaskClick?: (task: TaskWithRelations) => void;
}

type Quadrant = "do" | "schedule" | "delegate" | "eliminate";

interface QuadrantConfig {
  id: Quadrant;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const QUADRANTS: QuadrantConfig[] = [
  {
    id: "do",
    title: "Do First",
    subtitle: "Urgent & Important",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/20",
  },
  {
    id: "schedule",
    title: "Schedule",
    subtitle: "Important, Not Urgent",
    icon: <Target className="h-4 w-4" />,
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/20",
  },
  {
    id: "delegate",
    title: "Delegate",
    subtitle: "Urgent, Not Important",
    icon: <Clock className="h-4 w-4" />,
    color: "text-warning",
    bgColor: "bg-warning/10 border-warning/20",
  },
  {
    id: "eliminate",
    title: "Eliminate",
    subtitle: "Neither",
    icon: <Archive className="h-4 w-4" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50 border-muted",
  },
];

function classifyTask(task: TaskWithRelations): Quadrant {
  const isImportant = task.priority === "high" || task.priority === "urgent";

  // Urgent = due today, tomorrow, or overdue
  let isUrgent = false;
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    isUrgent = isToday(dueDate) || isTomorrow(dueDate) || isPast(dueDate) ||
               isBefore(dueDate, addDays(new Date(), 3));
  }
  // Also consider "urgent" priority as urgent
  if (task.priority === "urgent") {
    isUrgent = true;
  }

  if (isUrgent && isImportant) return "do";
  if (!isUrgent && isImportant) return "schedule";
  if (isUrgent && !isImportant) return "delegate";
  return "eliminate";
}

function QuadrantCard({
  config,
  tasks,
  onTaskClick,
}: {
  config: QuadrantConfig;
  tasks: TaskWithRelations[];
  onTaskClick?: (task: TaskWithRelations) => void;
}) {
  const handleComplete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await completeTask(taskId);
  };

  return (
    <Card className={cn("border", config.bgColor)}>
      <CardHeader className="pb-2">
        <CardTitle className={cn("text-sm font-medium flex items-center gap-2", config.color)}>
          {config.icon}
          {config.title}
          <Badge variant="secondary" className="ml-auto">
            {tasks.length}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{config.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">No tasks</p>
        ) : (
          tasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="flex items-start gap-2 p-2 rounded-md hover:bg-background/50 cursor-pointer group"
            >
              <Checkbox
                checked={task.status === "completed"}
                onClick={(e) => handleComplete(task.id, e)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm truncate",
                  task.status === "completed" && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </p>
                {task.due_date && (
                  <p className={cn(
                    "text-xs",
                    isPast(new Date(task.due_date)) && task.status !== "completed"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}>
                    {isToday(new Date(task.due_date))
                      ? "Today"
                      : isTomorrow(new Date(task.due_date))
                      ? "Tomorrow"
                      : format(new Date(task.due_date), "MMM d")}
                  </p>
                )}
              </div>
              {task.zeroed_lists && (
                <div
                  className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                  style={{ backgroundColor: task.zeroed_lists.color }}
                />
              )}
            </div>
          ))
        )}
        {tasks.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{tasks.length - 5} more
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function EisenhowerMatrix({ tasks, onTaskClick }: EisenhowerMatrixProps) {
  const quadrantTasks = useMemo(() => {
    const pending = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled");

    const grouped: Record<Quadrant, TaskWithRelations[]> = {
      do: [],
      schedule: [],
      delegate: [],
      eliminate: [],
    };

    pending.forEach((task) => {
      const quadrant = classifyTask(task);
      grouped[quadrant].push(task);
    });

    // Sort each quadrant: overdue first, then by due date
    Object.keys(grouped).forEach((key) => {
      grouped[key as Quadrant].sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    });

    return grouped;
  }, [tasks]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Eisenhower Matrix</h2>
          <p className="text-sm text-muted-foreground">
            Prioritize by urgency and importance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map((config) => (
          <QuadrantCard
            key={config.id}
            config={config}
            tasks={quadrantTasks[config.id]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Tasks are classified based on priority (importance) and due date (urgency)
      </p>
    </div>
  );
}
