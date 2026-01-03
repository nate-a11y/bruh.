"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Timer,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { completeTask, deleteTask } from "@/app/(dashboard)/actions";
import { useTimerStore } from "@/lib/hooks/use-timer";
import { playCompletionSound } from "@/lib/sounds";
import { PRIORITY_COLORS, type TaskPriority } from "@/lib/constants";
import type { Task } from "@/lib/supabase/types";

interface TaskItemProps {
  task: Task & {
    zeroed_lists?: { name: string; color: string } | null;
  };
  onEdit?: (task: Task) => void;
}

export function TaskItem({ task, onEdit }: TaskItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();
  const { startTimer, state: timerState } = useTimerStore();

  const isCompleted = task.status === "completed";
  const priorityColor = PRIORITY_COLORS[task.priority as TaskPriority];

  async function handleComplete() {
    setIsCompleting(true);
    const result = await completeTask(task.id);
    if (result.error) {
      toast.error(result.error);
    } else if (!isCompleted) {
      // Play sound only when completing, not uncompleting
      playCompletionSound();
    }
    setIsCompleting(false);
  }

  async function handleDelete() {
    const result = await deleteTask(task.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Task deleted");
    }
  }

  function handleStartFocus() {
    if (timerState !== "idle") {
      toast.error("A timer is already running. Stop it first.");
      return;
    }
    startTimer(task, task.estimated_minutes);
    router.push("/focus");
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "group flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50",
          isCompleted && "opacity-60"
        )}
      >
        {/* Checkbox */}
        <button
          onClick={handleComplete}
          disabled={isCompleting}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            isCompleted
              ? "border-success bg-success text-white"
              : "border-muted-foreground hover:border-primary"
          )}
        >
          {isCompleted && <Check className="h-3 w-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-medium",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </p>
              {task.notes && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                  {task.notes}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleStartFocus}
                disabled={isCompleted}
              >
                <Timer className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(task)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleStartFocus}>
                    <Timer className="mr-2 h-4 w-4" />
                    Start Focus
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Meta */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {task.zeroed_lists && (
              <div className="flex items-center gap-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: task.zeroed_lists.color }}
                />
                <span>{task.zeroed_lists.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatTime(task.estimated_minutes)}</span>
              {task.actual_minutes > 0 && (
                <span className="text-muted-foreground">
                  / {formatTime(task.actual_minutes)} actual
                </span>
              )}
            </div>
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(task.due_date), "MMM d")}</span>
                {task.due_time && <span>{task.due_time.slice(0, 5)}</span>}
              </div>
            )}
            {task.priority !== "normal" && (
              <Badge
                variant="outline"
                className={cn("text-xs capitalize", priorityColor)}
              >
                {task.priority}
              </Badge>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
