"use client";

import { useMemo } from "react";
import {
  format,
  subDays,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  estimated_minutes: number;
  actual_minutes: number;
  status: string;
  completed_at: string | null;
  due_date: string | null;
  priority: string;
  zeroed_lists?: { name: string; color: string } | null;
}

interface TimeReportsProps {
  tasks: Task[];
  dateRange?: "week" | "month" | "all";
}

export function TimeReports({ tasks, dateRange = "week" }: TimeReportsProps) {
  const stats = useMemo(() => {
    // Filter by date range
    const now = new Date();
    const startDate = dateRange === "week"
      ? subDays(now, 7)
      : dateRange === "month"
      ? subDays(now, 30)
      : subDays(now, 365);

    const filteredTasks = tasks.filter((t) => {
      if (!t.completed_at) return t.status === "in_progress";
      return new Date(t.completed_at) >= startDate;
    });

    const completedTasks = filteredTasks.filter((t) => t.status === "completed");
    const tasksWithEstimates = completedTasks.filter((t) => t.estimated_minutes > 0);

    // Calculate totals
    const totalEstimated = tasksWithEstimates.reduce(
      (sum, t) => sum + t.estimated_minutes,
      0
    );
    const totalActual = tasksWithEstimates.reduce(
      (sum, t) => sum + t.actual_minutes,
      0
    );

    // Calculate accuracy
    const accuracyPercentage = totalEstimated > 0
      ? Math.round((totalActual / totalEstimated) * 100)
      : 100;

    // Tasks under/over estimate
    const underEstimate = tasksWithEstimates.filter(
      (t) => t.actual_minutes < t.estimated_minutes
    ).length;
    const overEstimate = tasksWithEstimates.filter(
      (t) => t.actual_minutes > t.estimated_minutes
    ).length;
    const onTarget = tasksWithEstimates.filter(
      (t) => Math.abs(t.actual_minutes - t.estimated_minutes) <= 5
    ).length;

    // Time by list
    const timeByList: Record<string, { estimated: number; actual: number; color: string }> = {};
    completedTasks.forEach((t) => {
      const listName = t.zeroed_lists?.name || "No List";
      const listColor = t.zeroed_lists?.color || "#888";
      if (!timeByList[listName]) {
        timeByList[listName] = { estimated: 0, actual: 0, color: listColor };
      }
      timeByList[listName].estimated += t.estimated_minutes;
      timeByList[listName].actual += t.actual_minutes;
    });

    // Daily breakdown for chart
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const dailyData = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayTasks = completedTasks.filter(
        (t) => t.completed_at && t.completed_at.startsWith(dayStr)
      );
      return {
        date: format(day, "EEE"),
        fullDate: dayStr,
        estimated: dayTasks.reduce((sum, t) => sum + t.estimated_minutes, 0),
        actual: dayTasks.reduce((sum, t) => sum + t.actual_minutes, 0),
        count: dayTasks.length,
      };
    });

    // Top time-consuming tasks
    const topTasks = [...completedTasks]
      .sort((a, b) => b.actual_minutes - a.actual_minutes)
      .slice(0, 5);

    return {
      totalEstimated,
      totalActual,
      accuracyPercentage,
      tasksWithEstimates: tasksWithEstimates.length,
      completedCount: completedTasks.length,
      underEstimate,
      overEstimate,
      onTarget,
      timeByList,
      dailyData,
      topTasks,
    };
  }, [tasks, dateRange]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.totalActual)}</div>
            <p className="text-xs text-muted-foreground">
              from {stats.completedCount} tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimation Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.accuracyPercentage > 120 && "text-orange-500",
              stats.accuracyPercentage < 80 && "text-blue-500",
              stats.accuracyPercentage >= 80 && stats.accuracyPercentage <= 120 && "text-green-500"
            )}>
              {stats.accuracyPercentage}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalActual > stats.totalEstimated ? "over" : "under"} estimate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Estimate</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.underEstimate}</div>
            <p className="text-xs text-muted-foreground">
              tasks finished early
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Estimate</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.overEstimate}</div>
            <p className="text-xs text-muted-foreground">
              tasks took longer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.dailyData.map((day) => (
              <div key={day.fullDate} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium w-12">{day.date}</span>
                  <span className="text-muted-foreground flex-1 text-center">
                    {day.count} tasks
                  </span>
                  <span className="w-24 text-right">
                    {day.actual > 0 ? formatTime(day.actual) : "-"}
                  </span>
                </div>
                <div className="flex gap-1 h-6">
                  {day.estimated > 0 && (
                    <div
                      className="bg-muted rounded"
                      style={{
                        width: `${Math.min((day.estimated / 480) * 100, 100)}%`,
                      }}
                      title={`Estimated: ${formatTime(day.estimated)}`}
                    />
                  )}
                  {day.actual > 0 && (
                    <div
                      className={cn(
                        "rounded",
                        day.actual > day.estimated ? "bg-orange-500" : "bg-green-500"
                      )}
                      style={{
                        width: `${Math.min((day.actual / 480) * 100, 100)}%`,
                      }}
                      title={`Actual: ${formatTime(day.actual)}`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-muted rounded" />
              Estimated
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              Actual (under)
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded" />
              Actual (over)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time by List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Time by List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.timeByList)
              .sort((a, b) => b[1].actual - a[1].actual)
              .map(([listName, data]) => (
                <div key={listName} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: data.color }}
                      />
                      <span className="font-medium">{listName}</span>
                    </div>
                    <span>{formatTime(data.actual)}</span>
                  </div>
                  <Progress
                    value={
                      data.estimated > 0
                        ? Math.min((data.actual / data.estimated) * 100, 150)
                        : 100
                    }
                    className={cn(
                      data.actual > data.estimated && "[&>div]:bg-orange-500"
                    )}
                  />
                </div>
              ))}
            {Object.keys(stats.timeByList).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No time data yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Time-Consuming Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Most Time-Consuming Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topTasks.map((task, index) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{task.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {task.zeroed_lists && (
                        <Badge variant="outline" className="text-xs">
                          {task.zeroed_lists.name}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatTime(task.actual_minutes)}</p>
                  {task.estimated_minutes > 0 && (
                    <p className={cn(
                      "text-xs",
                      task.actual_minutes > task.estimated_minutes
                        ? "text-orange-500"
                        : "text-green-500"
                    )}>
                      {task.actual_minutes > task.estimated_minutes ? "+" : "-"}
                      {Math.abs(task.actual_minutes - task.estimated_minutes)}m
                    </p>
                  )}
                </div>
              </div>
            ))}
            {stats.topTasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No completed tasks with time tracking yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
