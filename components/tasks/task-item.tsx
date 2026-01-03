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
  Repeat,
  ChevronDown,
  ChevronRight,
  SkipForward,
  StopCircle,
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
import {
  completeTask,
  deleteTask,
  completeRecurringTask,
  skipRecurringOccurrence,
  stopRecurring,
} from "@/app/(dashboard)/actions";
import { useTimerStore } from "@/lib/hooks/use-timer";
import { playCompletionSound } from "@/lib/sounds";
import { PRIORITY_COLORS, type TaskPriority } from "@/lib/constants";
import { SubtaskList } from "./subtask-list";
import { TagBadge } from "@/components/tags/tag-badge";
import type { Task, Tag } from "@/lib/supabase/types";

interface TaskItemProps {
  task: Task & {
    zeroed_lists?: { name: string; color: string } | null;
    tags?: Tag[];
    subtasks?: Task[];
  };
  onEdit?: (task: Task) => void;
  onUpdate?: () => void;
}

export function TaskItem({ task, onEdit, onUpdate }: TaskItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const router = useRouter();
  const { startTimer, state: timerState } = useTimerStore();

  const isCompleted = task.status === "completed";
  const priorityColor = PRIORITY_COLORS[task.priority as TaskPriority];
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.status === "completed").length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;

  async function handleComplete() {
    setIsCompleting(true);
    // Use recurring-specific action if task is recurring
    const result = task.is_recurring
      ? await completeRecurringTask(task.id)
      : await completeTask(task.id);
    if (result.error) {
      toast.error(result.error);
    } else if (!isCompleted) {
      playCompletionSound();
    }
    setIsCompleting(false);
  }

  async function handleSkipOccurrence() {
    const result = await skipRecurringOccurrence(task.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Occurrence skipped");
    }
  }

  async function handleStopRecurring() {
    const result = await stopRecurring(task.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Recurrence stopped");
    }
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
        {/* Expand subtasks button */}
        {hasSubtasks && (
          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {showSubtasks ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}

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
                  {task.is_recurring && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSkipOccurrence}>
                        <SkipForward className="mr-2 h-4 w-4" />
                        Skip Occurrence
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleStopRecurring}>
                        <StopCircle className="mr-2 h-4 w-4" />
                        Stop Recurring
                      </DropdownMenuItem>
                    </>
                  )}
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

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
          )}

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
            {task.is_recurring && (
              <div className="flex items-center gap-1 text-primary">
                <Repeat className="h-3 w-3" />
                <span>Recurring</span>
              </div>
            )}
            {hasSubtasks && (
              <div className="flex items-center gap-1">
                <span>
                  {completedSubtasks}/{totalSubtasks} subtasks
                </span>
              </div>
            )}
          </div>

          {/* Subtasks */}
          {showSubtasks && hasSubtasks && (
            <SubtaskList
              parentId={task.id}
              subtasks={task.subtasks!}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
