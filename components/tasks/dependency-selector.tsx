"use client";

import { useState } from "react";
import { Check, Link, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskOption {
  id: string;
  title: string;
  status: string;
  list_name?: string;
}

interface DependencySelectorProps {
  availableTasks: TaskOption[];
  selectedDependencies: string[];
  onChange: (dependencies: string[]) => void;
  currentTaskId?: string;
}

export function DependencySelector({
  availableTasks,
  selectedDependencies,
  onChange,
  currentTaskId,
}: DependencySelectorProps) {
  const [open, setOpen] = useState(false);

  // Filter out the current task and already selected ones from options
  const filteredTasks = availableTasks.filter(
    (task) => task.id !== currentTaskId
  );

  const selectedTasks = filteredTasks.filter((task) =>
    selectedDependencies.includes(task.id)
  );

  const hasBlockingIncomplete = selectedTasks.some(
    (task) => task.status !== "completed"
  );

  function toggleDependency(taskId: string) {
    if (selectedDependencies.includes(taskId)) {
      onChange(selectedDependencies.filter((id) => id !== taskId));
    } else {
      onChange([...selectedDependencies, taskId]);
    }
  }

  function removeDependency(taskId: string) {
    onChange(selectedDependencies.filter((id) => id !== taskId));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
            >
              <Link className="h-3.5 w-3.5" />
              <span>Blocked by</span>
              {selectedDependencies.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {selectedDependencies.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tasks..." />
              <CommandList>
                <CommandEmpty>No tasks found.</CommandEmpty>
                <CommandGroup heading="Select blocking tasks">
                  {filteredTasks.map((task) => {
                    const isSelected = selectedDependencies.includes(task.id);
                    const isCompleted = task.status === "completed";

                    return (
                      <CommandItem
                        key={task.id}
                        value={task.title}
                        onSelect={() => toggleDependency(task.id)}
                        className="flex items-center gap-2"
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded border",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span
                          className={cn(
                            "flex-1 truncate",
                            isCompleted && "line-through text-muted-foreground"
                          )}
                        >
                          {task.title}
                        </span>
                        {task.list_name && (
                          <span className="text-xs text-muted-foreground">
                            {task.list_name}
                          </span>
                        )}
                        {isCompleted && (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {hasBlockingIncomplete && (
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Has incomplete blockers</span>
          </div>
        )}
      </div>

      {/* Selected dependencies */}
      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTasks.map((task) => (
            <Badge
              key={task.id}
              variant={task.status === "completed" ? "secondary" : "outline"}
              className={cn(
                "gap-1 pr-1",
                task.status !== "completed" && "border-amber-500/50 text-amber-600"
              )}
            >
              {task.status === "completed" ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              <span className="max-w-[150px] truncate">{task.title}</span>
              <button
                type="button"
                onClick={() => removeDependency(task.id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
