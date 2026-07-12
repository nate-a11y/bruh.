"use client";

import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TimeEntry } from "@/lib/supabase/types";

interface TimesheetProps {
  entries: (TimeEntry & { zeroed_tasks?: { title: string } | null })[];
  onAddEntry?: (date: Date) => void;
}

export function Timesheet({ entries, onAddEntry }: TimesheetProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const entriesByDay = useMemo(() => {
    const byDay: Record<string, typeof entries> = {};
    days.forEach((d) => (byDay[format(d, "yyyy-MM-dd")] = []));
    entries.forEach((e) => {
      const key = format(new Date(e.start_time), "yyyy-MM-dd");
      if (byDay[key]) byDay[key].push(e);
    });
    return byDay;
  }, [entries, days]);

  const weekTotal = Object.values(entriesByDay)
    .flat()
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Timesheet</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d")}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayEntries = entriesByDay[dateKey] || [];
            const total = dayEntries.reduce((s, e) => s + e.duration_minutes, 0);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={dateKey}
                className={cn(
                  "border rounded-lg p-2 min-h-[120px]",
                  isToday && "border-primary"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn("text-sm font-medium", isToday && "text-primary")}
                  >
                    {format(day, "EEE d")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onAddEntry?.(day)}
                    aria-label={`Add entry for ${format(day, "EEE d")}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="text-xs p-1 rounded bg-primary/10 truncate"
                    >
                      {entry.zeroed_tasks?.title || entry.description || "Untitled"}
                      <span className="text-muted-foreground ml-1">
                        {entry.duration_minutes}m
                      </span>
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{dayEntries.length - 3} more
                    </span>
                  )}
                </div>
                {total > 0 && (
                  <div className="mt-auto pt-2 border-t text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.floor(total / 60)}h {total % 60}m
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Week Total</p>
            <p className="text-2xl font-bold">
              {Math.floor(weekTotal / 60)}h {weekTotal % 60}m
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
