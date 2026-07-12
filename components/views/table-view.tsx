"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ArrowUpDown, Check, Clock, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { completeTask, deleteTask } from "@/app/(dashboard)/actions";
import { TABLE_COLUMN_LABELS, PRIORITY_COLORS } from "@/lib/constants";
import type { TaskWithRelations, List } from "@/lib/supabase/types";

interface TableViewProps {
  tasks: TaskWithRelations[];
  lists: List[];
  columns?: string[];
  onTaskClick?: (task: TaskWithRelations) => void;
}

type SortConfig = {
  column: string;
  direction: "asc" | "desc";
} | null;

export function TableView({ tasks, lists, columns = ["title", "status", "priority", "due_date", "estimated_minutes", "list"], onTaskClick }: TableViewProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortConfig) return 0;

    const { column, direction } = sortConfig;
    let aVal: unknown = a[column as keyof TaskWithRelations];
    let bVal: unknown = b[column as keyof TaskWithRelations];

    if (column === "list") {
      aVal = a.zeroed_lists?.name || "";
      bVal = b.zeroed_lists?.name || "";
    }

    if (aVal === null || aVal === undefined) return direction === "asc" ? 1 : -1;
    if (bVal === null || bVal === undefined) return direction === "asc" ? -1 : 1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  function handleSort(column: string) {
    setSortConfig(current => {
      if (current?.column === column) {
        if (current.direction === "asc") return { column, direction: "desc" };
        return null;
      }
      return { column, direction: "asc" };
    });
  }

  function renderCell(task: TaskWithRelations, column: string) {
    switch (column) {
      case "title":
        return (
          <span className={cn(task.status === "completed" && "line-through text-muted-foreground")}>
            {task.title}
          </span>
        );
      case "status":
        return (
          <Badge variant={task.status === "completed" ? "default" : "secondary"} className="capitalize">
            {task.status.replace("_", " ")}
          </Badge>
        );
      case "priority":
        return (
          <span className={cn("capitalize", PRIORITY_COLORS[task.priority])}>
            {task.priority}
          </span>
        );
      case "due_date":
        return task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "-";
      case "due_time":
        return task.due_time || "-";
      case "estimated_minutes":
        return task.estimated_minutes ? `${task.estimated_minutes}m` : "-";
      case "actual_minutes":
        return task.actual_minutes ? `${task.actual_minutes}m` : "-";
      case "list":
        return task.zeroed_lists ? (
          <Badge variant="outline" style={{ borderColor: task.zeroed_lists.color }}>
            {task.zeroed_lists.name}
          </Badge>
        ) : "-";
      case "created_at":
        return format(new Date(task.created_at), "MMM d, yyyy");
      case "completed_at":
        return task.completed_at ? format(new Date(task.completed_at), "MMM d, yyyy") : "-";
      default:
        return "-";
    }
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="w-10 p-3">
                <span className="sr-only">Complete</span>
              </th>
              {columns.map((column) => (
                <th key={column} className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 -ml-2 font-medium"
                    onClick={() => handleSort(column)}
                  >
                    {TABLE_COLUMN_LABELS[column] || column}
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </th>
              ))}
              <th className="w-10 p-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <tr
                key={task.id}
                className="border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => onTaskClick?.(task)}
              >
                <td className="p-3">
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={() => completeTask(task.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                {columns.map((column) => (
                  <td key={column} className="p-3 text-sm">
                    {renderCell(task, column)}
                  </td>
                ))}
                <td className="p-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Task actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => completeTask(task.id)}>
                        <Check className="h-4 w-4 mr-2" />
                        {task.status === "completed" ? "Uncomplete" : "Complete"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedTasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No tasks to display
          </div>
        )}
      </div>
    </div>
  );
}
