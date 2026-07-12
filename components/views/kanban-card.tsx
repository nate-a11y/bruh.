"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isToday, isPast } from "date-fns";
import type { TaskWithRelations } from "@/lib/supabase/types";
import { PRIORITY_COLORS } from "@/lib/constants";

interface KanbanCardProps {
  task: TaskWithRelations;
  onClick?: () => void;
  isOverlay?: boolean;
}

export function KanbanCard({ task, onClick, isOverlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow",
        isDragging && "opacity-50",
        isOverlay && "shadow-lg rotate-2"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            task.status === "completed" && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.zeroed_lists && (
              <Badge variant="outline" className="text-xs" style={{ borderColor: task.zeroed_lists.color }}>
                {task.zeroed_lists.name}
              </Badge>
            )}
            {task.due_date && (
              <span className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-destructive" : "text-muted-foreground"
              )}>
                <Calendar className="h-3 w-3" />
                {isToday(new Date(task.due_date)) ? "Today" : format(new Date(task.due_date), "MMM d")}
              </span>
            )}
            {task.estimated_minutes > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {task.estimated_minutes}m
              </span>
            )}
          </div>
        </div>
        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", PRIORITY_COLORS[task.priority])}
             style={{ backgroundColor: task.priority === "urgent" ? "#ef4444" : task.priority === "high" ? "#f59e0b" : undefined }} />
      </div>
    </div>
  );
}
