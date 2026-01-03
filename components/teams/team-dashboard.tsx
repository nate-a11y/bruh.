"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  FolderKanban,
  Plus,
  Settings,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  user?: {
    email: string;
    avatar_url?: string;
  };
}

interface TeamProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  task_count?: number;
  completed_count?: number;
}

interface TeamTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  project?: {
    name: string;
    color: string;
  };
}

interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
}

interface TeamDashboardProps {
  team: Team;
  members: TeamMember[];
  projects: TeamProject[];
  recentTasks: TeamTask[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    totalHours: number;
  };
  userRole: "owner" | "admin" | "member" | "viewer";
}

export function TeamDashboard({
  team,
  members,
  projects,
  recentTasks,
  stats,
  userRole,
}: TeamDashboardProps) {
  const canManage = userRole === "owner" || userRole === "admin";
  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={team.avatar_url || undefined} />
            <AvatarFallback className="text-xl">
              {team.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            {team.description && (
              <p className="text-muted-foreground">{team.description}</p>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/teams/${team.slug}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/teams/${team.slug}/invite`}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <Progress value={completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {completionRate}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.completedTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              tasks done
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.overdueTasks > 0 && "text-red-500"
            )}>
              {stats.overdueTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}h</div>
            <p className="text-xs text-muted-foreground">
              this week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projects</h2>
            {canManage && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/teams/${team.slug}/projects/new`}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Project
                </Link>
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/teams/${team.slug}/projects/${project.id}`}
              >
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: project.color }}
                        />
                        <div>
                          <h3 className="font-medium">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {project.completed_count || 0}/{project.task_count || 0}
                      </Badge>
                    </div>
                    {project.task_count && project.task_count > 0 && (
                      <Progress
                        value={((project.completed_count || 0) / project.task_count) * 100}
                        className="mt-3"
                      />
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
            {projects.length === 0 && (
              <Card className="col-span-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FolderKanban className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No projects yet</p>
                  {canManage && (
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link href={`/teams/${team.slug}/projects/new`}>
                        Create First Project
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Tasks */}
          <div className="space-y-4 mt-6">
            <h2 className="text-lg font-semibold">Recent Tasks</h2>
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <Card key={task.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          task.priority === "urgent" && "bg-red-500",
                          task.priority === "high" && "bg-orange-500",
                          task.priority === "normal" && "bg-blue-500",
                          task.priority === "low" && "bg-gray-400"
                        )}
                      />
                      <div>
                        <p className={cn(
                          "font-medium",
                          task.status === "completed" && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {task.project && (
                            <Badge variant="outline" style={{ borderColor: task.project.color }}>
                              {task.project.name}
                            </Badge>
                          )}
                          {task.due_date && (
                            <span>{format(new Date(task.due_date), "MMM d")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {task.assignee && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assignee.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {task.assignee.display_name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </CardContent>
                </Card>
              ))}
              {recentTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Team Members</h2>
            <Badge variant="secondary">{members.length}</Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.avatar_url} />
                        <AvatarFallback>
                          {(member.display_name || member.user?.email || "?")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.display_name || member.user?.email}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {member.role}
                        </p>
                      </div>
                    </div>
                    {canManage && member.role !== "owner" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Change Role</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500">
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
