"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  parseISO,
} from "date-fns";
import {
  TrendingUp,
  Target,
  Clock,
  Calendar,
  Flame,
  CheckCircle2,
  Timer,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  priority: string;
  status: string;
  estimated_minutes?: number;
}

interface DashboardStats {
  tasksCompleted: number;
  tasksTotal: number;
  focusMinutes: number;
  streak: number;
  weeklyTasksCompleted: number;
  weeklyFocusMinutes: number;
}

interface EnhancedDashboardProps {
  tasks: Task[];
  stats: DashboardStats;
  userName?: string;
}

export function EnhancedDashboard({ tasks, stats, userName }: EnhancedDashboardProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const todayTasks = tasks.filter((t) => t.due_date === format(new Date(), "yyyy-MM-dd"));
  const completedToday = todayTasks.filter((t) => t.status === "completed").length;
  const pendingToday = todayTasks.filter((t) => t.status !== "completed");
  const overdueTasks = tasks.filter(
    (t) => t.due_date && parseISO(t.due_date) < new Date() && t.status !== "completed"
  );

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Group tasks by day for week view
  const tasksByDay: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    if (task.due_date) {
      if (!tasksByDay[task.due_date]) tasksByDay[task.due_date] = [];
      tasksByDay[task.due_date].push(task);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header / Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {hour < 17 ? <Sun className="h-6 w-6 text-yellow-500" /> : <Moon className="h-6 w-6 text-blue-400" />}
            {greeting}{userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.streak > 0 && (
            <Badge variant="secondary" className="gap-1 py-1 px-3">
              <Flame className="h-4 w-4 text-orange-500" />
              {stats.streak} day streak
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          label="Completed Today"
          value={completedToday}
          subtext={`of ${todayTasks.length} tasks`}
        />
        <StatCard
          icon={<Timer className="h-5 w-5 text-blue-500" />}
          label="Focus Time"
          value={`${Math.floor(stats.focusMinutes / 60)}h ${stats.focusMinutes % 60}m`}
          subtext="today"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-purple-500" />}
          label="Weekly Progress"
          value={stats.weeklyTasksCompleted}
          subtext="tasks this week"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
          label="Streak"
          value={stats.streak}
          subtext="days"
          highlight={stats.streak >= 7}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Today's Tasks */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-4"
        >
          {/* Today's Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                Today's Progress
                <span className="text-sm font-normal text-muted-foreground">
                  {completedToday}/{todayTasks.length} tasks
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress
                value={todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : 0}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{Math.round((completedToday / (todayTasks.length || 1)) * 100)}% complete</span>
                <span>
                  {pendingToday.reduce((s, t) => s + (t.estimated_minutes || 0), 0)} min remaining
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Overdue Warning */}
          {overdueTasks.length > 0 && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-red-600 dark:text-red-400">
                      {overdueTasks.length} Overdue Task{overdueTasks.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Needs your attention
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/today">
                    View
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Priority Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Focus on These
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingToday.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>All caught up for today!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingToday
                    .sort((a, b) => {
                      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
                      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
                        (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
                    })
                    .slice(0, 5)
                    .map((task, i) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          "p-3 rounded-lg border flex items-center justify-between",
                          task.priority === "urgent" && "border-red-500/50 bg-red-500/5",
                          task.priority === "high" && "border-orange-500/50 bg-orange-500/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            task.priority === "urgent" && "bg-red-500",
                            task.priority === "high" && "bg-orange-500",
                            task.priority === "normal" && "bg-blue-500",
                            task.priority === "low" && "bg-gray-400"
                          )} />
                          <span className="font-medium">{task.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {task.due_time && (
                            <span>{task.due_time.slice(0, 5)}</span>
                          )}
                          {task.estimated_minutes && (
                            <Badge variant="secondary" className="text-xs">
                              {task.estimated_minutes}m
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  {pendingToday.length > 5 && (
                    <Button variant="ghost" className="w-full" asChild>
                      <Link href="/today">
                        View all {pendingToday.length} tasks
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column - Week View & More */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* Week at a Glance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayTasks = tasksByDay[dateKey] || [];
                  const completed = dayTasks.filter((t) => t.status === "completed").length;
                  const total = dayTasks.length;
                  const isCurrent = isToday(day);

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        "aspect-square rounded-lg flex flex-col items-center justify-center text-center p-1",
                        isCurrent && "bg-primary text-primary-foreground",
                        !isCurrent && total > 0 && completed === total && "bg-green-500/20",
                        !isCurrent && total > 0 && completed < total && "bg-muted"
                      )}
                    >
                      <span className="text-[10px] font-medium">
                        {format(day, "EEE")}
                      </span>
                      <span className={cn("text-lg font-bold", isCurrent && "text-primary-foreground")}>
                        {format(day, "d")}
                      </span>
                      {total > 0 && (
                        <span className="text-[9px]">
                          {completed}/{total}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
                <Link href="/calendar">
                  View Calendar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Weekly Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Weekly Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tasks Completed</span>
                <span className="font-bold">{stats.weeklyTasksCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Focus Time</span>
                <span className="font-bold">
                  {Math.floor(stats.weeklyFocusMinutes / 60)}h {stats.weeklyFocusMinutes % 60}m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Tasks/Day</span>
                <span className="font-bold">
                  {(stats.weeklyTasksCompleted / 7).toFixed(1)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
                <Link href="/focus">
                  <Timer className="h-5 w-5" />
                  <span className="text-xs">Focus</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
                <Link href="/habits">
                  <Target className="h-5 w-5" />
                  <span className="text-xs">Habits</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
                <Link href="/calendar">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Calendar</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
                <Link href="/stats">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-xs">Stats</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  subtext,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-primary/50 bg-primary/5")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">
              {label}
              {subtext && <span className="block">{subtext}</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
