"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface ArchiveStatsProps {
  data: Array<{
    completed_at: string;
    actual_minutes: number | null;
  }>;
}

export function ArchiveStats({ data }: ArchiveStatsProps) {
  const totalCompleted = data.length;
  const totalMinutes = data.reduce((sum, entry) => sum + (entry.actual_minutes || 0), 0);
  const avgPerDay = totalCompleted > 0 ? Math.round(totalCompleted / 30 * 10) / 10 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Completed (30d)</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCompleted}</div>
          <p className="text-xs text-muted-foreground">tasks completed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Time Logged</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(totalMinutes / 60)}h {totalMinutes % 60}m
          </div>
          <p className="text-xs text-muted-foreground">total time</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgPerDay}</div>
          <p className="text-xs text-muted-foreground">tasks per day</p>
        </CardContent>
      </Card>
    </div>
  );
}
