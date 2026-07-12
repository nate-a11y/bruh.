"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreVertical, User, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  user_id: string;
  role: string;
  display_name: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "review" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  assignee_id: string | null;
  due_date: string | null;
  estimated_minutes: number;
  assignee?: { id: string; email: string } | null;
}

interface TeamTaskBoardProps {
  teamSlug: string;
  projectId: string;
  tasks: Task[];
  members: TeamMember[];
  canManage: boolean;
}

const COLUMNS = [
  { id: "pending", label: "To Do", color: "bg-gray-500" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { id: "review", label: "In Review", color: "bg-yellow-500" },
  { id: "completed", label: "Done", color: "bg-green-500" },
];

export function TeamTaskBoard({
  teamSlug,
  projectId,
  tasks: initialTasks,
  members,
  canManage,
}: TeamTaskBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);

  async function updateTaskStatus(taskId: string, newStatus: string) {
    const supabase = createClient() as any;

    const { error } = await supabase
      .from("zeroed_team_tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      return;
    }

    setTasks(tasks.map(t =>
      t.id === taskId
        ? { ...t, status: newStatus as Task["status"] }
        : t
    ));
    toast.success("Task updated");
  }

  async function assignTask(taskId: string, userId: string | null) {
    const supabase = createClient() as any;

    const { error } = await supabase
      .from("zeroed_team_tasks")
      .update({ assignee_id: userId })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to assign task");
      return;
    }

    setTasks(tasks.map(t =>
      t.id === taskId
        ? { ...t, assignee_id: userId }
        : t
    ));
    toast.success(userId ? "Task assigned" : "Assignee removed");
  }

  function getTasksByStatus(status: string) {
    return tasks.filter(t => t.status === status);
  }

  return (
    <div className="flex gap-4 p-6 overflow-x-auto min-h-full">
      {COLUMNS.map((column) => (
        <div
          key={column.id}
          className="flex-shrink-0 w-72 bg-muted/30 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={cn("w-2 h-2 rounded-full", column.color)} />
            <h3 className="font-medium text-sm">{column.label}</h3>
            <Badge variant="secondary" className="ml-auto">
              {getTasksByStatus(column.id).length}
            </Badge>
          </div>

          <div className="space-y-2">
            {getTasksByStatus(column.id).map((task) => (
              <Card
                key={task.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {task.title}
                    </h4>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" aria-label="Task actions">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(
                              `/teams/${teamSlug}/projects/${projectId}/tasks/${task.id}`
                            )}
                          >
                            Edit Task
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {COLUMNS.filter(c => c.id !== task.status).map(c => (
                            <DropdownMenuItem
                              key={c.id}
                              onClick={() => updateTaskStatus(task.id, c.id)}
                            >
                              Move to {c.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => assignTask(task.id, null)}
                            disabled={!task.assignee_id}
                          >
                            Unassign
                          </DropdownMenuItem>
                          {members.map(m => (
                            <DropdownMenuItem
                              key={m.user_id}
                              onClick={() => assignTask(task.id, m.user_id)}
                            >
                              Assign to {m.display_name || m.user_id.slice(0, 8)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        task.priority === "urgent" && "border-red-500 text-red-500",
                        task.priority === "high" && "border-orange-500 text-orange-500",
                        task.priority === "normal" && "border-blue-500 text-blue-500",
                        task.priority === "low" && "border-gray-400 text-gray-400"
                      )}
                    >
                      {task.priority}
                    </Badge>

                    {task.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_date), "MMM d")}
                      </span>
                    )}

                    {task.estimated_minutes > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.estimated_minutes}m
                      </span>
                    )}
                  </div>

                  {task.assignee && (
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">
                          {task.assignee.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">
                        {task.assignee.email}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => router.push(
                  `/teams/${teamSlug}/projects/${projectId}/tasks/new?status=${column.id}`
                )}
              >
                + Add task
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
