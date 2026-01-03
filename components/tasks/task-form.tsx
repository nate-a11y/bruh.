"use client";

import { useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createTask, updateTask } from "@/app/(dashboard)/actions";
import { TASK_PRIORITIES } from "@/lib/constants";
import type { Task, List } from "@/lib/supabase/types";

interface TaskFormProps {
  lists: Pick<List, "id" | "name">[];
  defaultListId?: string;
  task?: Task;
  onClose: () => void;
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isEditing ? "Update" : "Add Task"}
    </Button>
  );
}

export function TaskForm({
  lists,
  defaultListId,
  task,
  onClose,
}: TaskFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!task;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(formData: FormData) {
    if (isEditing && task) {
      const result = await updateTask(task.id, {
        title: formData.get("title") as string,
        list_id: formData.get("listId") as string,
        notes: (formData.get("notes") as string) || null,
        estimated_minutes: parseInt(
          (formData.get("estimatedMinutes") as string) || "25"
        ),
        priority: formData.get("priority") as string,
        due_date: (formData.get("dueDate") as string) || null,
        due_time: (formData.get("dueTime") as string) || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Updated.");
        onClose();
      }
    } else {
      const result = await createTask(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Added. Now handle it.");
        formRef.current?.reset();
        onClose();
      }
    }
  }

  return (
    <Card className="border-primary/50">
      <CardContent className="p-4">
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-3">
              <Input
                ref={inputRef}
                name="title"
                placeholder="Task title"
                defaultValue={task?.title || ""}
                required
              />
              <Input
                name="notes"
                placeholder="Notes (optional)"
                defaultValue={task?.notes || ""}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="listId" className="text-xs">
                List
              </Label>
              <select
                id="listId"
                name="listId"
                defaultValue={task?.list_id || defaultListId}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="estimatedMinutes" className="text-xs">
                Estimate (min)
              </Label>
              <Input
                id="estimatedMinutes"
                name="estimatedMinutes"
                type="number"
                min="1"
                max="480"
                defaultValue={task?.estimated_minutes || 25}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="priority" className="text-xs">
                Priority
              </Label>
              <select
                id="priority"
                name="priority"
                defaultValue={task?.priority || "normal"}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring capitalize"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="dueDate" className="text-xs">
                Due Date
              </Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={task?.due_date || ""}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton isEditing={isEditing} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
