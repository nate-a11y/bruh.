"use client";

import { useState } from "react";
import { Plus, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createSubtask, completeTask, deleteTask } from "@/app/(dashboard)/actions";
import { toast } from "sonner";
import type { Task } from "@/lib/supabase/types";

interface SubtaskListProps {
  parentId: string;
  subtasks: Task[];
  onUpdate?: () => void;
}

export function SubtaskList({ parentId, subtasks, onUpdate }: SubtaskListProps) {
  const [showInput, setShowInput] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsAdding(true);
    const formData = new FormData();
    formData.set("title", newTitle);
    formData.set("estimatedMinutes", "15");

    const result = await createSubtask(parentId, formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      setNewTitle("");
      toast.success("Subtask added");
      onUpdate?.();
    }
    setIsAdding(false);
  }

  async function handleToggleComplete(subtask: Task) {
    const result = await completeTask(subtask.id);
    if (result.error) {
      toast.error(result.error);
    }
    onUpdate?.();
  }

  async function handleDelete(subtaskId: string) {
    const result = await deleteTask(subtaskId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Subtask deleted");
      onUpdate?.();
    }
  }

  const completed = subtasks.filter((s) => s.status === "completed").length;
  const total = subtasks.length;

  return (
    <div className="mt-3 ml-6 space-y-2">
      {/* Progress indicator */}
      {total > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
          <span>
            {completed}/{total}
          </span>
        </div>
      )}

      {/* Subtask items */}
      <AnimatePresence mode="popLayout">
        {subtasks.map((subtask) => (
          <motion.div
            key={subtask.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 group"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
            <Checkbox
              checked={subtask.status === "completed"}
              onCheckedChange={() => handleToggleComplete(subtask)}
              className="h-4 w-4"
            />
            <span
              className={cn(
                "flex-1 text-sm",
                subtask.status === "completed" &&
                  "line-through text-muted-foreground"
              )}
            >
              {subtask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => handleDelete(subtask.id)}
            >
              <span className="sr-only">Delete</span>×
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add subtask input */}
      {showInput ? (
        <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Subtask title"
            className="h-8 text-sm"
            autoFocus
            disabled={isAdding}
            onBlur={() => {
              if (!newTitle.trim()) setShowInput(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowInput(false);
                setNewTitle("");
              }
            }}
          />
          <Button type="submit" size="sm" disabled={isAdding || !newTitle.trim()}>
            Add
          </Button>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 text-xs"
          onClick={() => setShowInput(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add subtask
        </Button>
      )}
    </div>
  );
}
