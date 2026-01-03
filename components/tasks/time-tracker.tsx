"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, Square, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TimeTrackerProps {
  taskId: string;
  taskTitle: string;
  estimatedMinutes: number;
  actualMinutes: number;
  onTimeUpdate: (minutes: number) => Promise<void>;
  compact?: boolean;
}

export function TimeTracker({
  taskId,
  taskTitle,
  estimatedMinutes,
  actualMinutes,
  onTimeUpdate,
  compact = false,
}: TimeTrackerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(actualMinutes * 60);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  // Load active timer from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`timer-${taskId}`);
    if (stored) {
      const { startTime, elapsed } = JSON.parse(stored);
      if (startTime) {
        setSessionStart(new Date(startTime));
        setIsRunning(true);
        // Calculate elapsed time since start
        const now = new Date();
        const additionalSeconds = Math.floor(
          (now.getTime() - new Date(startTime).getTime()) / 1000
        );
        setElapsedSeconds(elapsed + additionalSeconds);
      } else {
        setElapsedSeconds(elapsed);
      }
    }
  }, [taskId]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Save timer state
  const saveTimerState = useCallback(() => {
    localStorage.setItem(
      `timer-${taskId}`,
      JSON.stringify({
        startTime: sessionStart?.toISOString() || null,
        elapsed: elapsedSeconds,
      })
    );
  }, [taskId, sessionStart, elapsedSeconds]);

  useEffect(() => {
    saveTimerState();
  }, [elapsedSeconds, saveTimerState]);

  const handleStart = () => {
    setIsRunning(true);
    setSessionStart(new Date());
  };

  const handlePause = async () => {
    setIsRunning(false);
    setSessionStart(null);
    // Save to database
    const totalMinutes = Math.floor(elapsedSeconds / 60);
    await onTimeUpdate(totalMinutes);
  };

  const handleStop = async () => {
    setIsRunning(false);
    setSessionStart(null);
    const totalMinutes = Math.floor(elapsedSeconds / 60);
    await onTimeUpdate(totalMinutes);
    // Clear localStorage
    localStorage.removeItem(`timer-${taskId}`);
  };

  // Format time display
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const timeDisplay = hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Calculate progress
  const estimatedSeconds = estimatedMinutes * 60;
  const progress = estimatedSeconds > 0 ? Math.min((elapsedSeconds / estimatedSeconds) * 100, 150) : 0;
  const isOvertime = elapsedSeconds > estimatedSeconds && estimatedSeconds > 0;
  const overtimeMinutes = isOvertime ? Math.floor((elapsedSeconds - estimatedSeconds) / 60) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant={isRunning ? "default" : "secondary"}
          className={cn(
            "font-mono",
            isRunning && "animate-pulse",
            isOvertime && "bg-orange-500"
          )}
        >
          <Clock className="h-3 w-3 mr-1" />
          {timeDisplay}
        </Badge>
        {!isRunning ? (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleStart}>
            <Play className="h-3 w-3" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePause}>
            <Pause className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Tracking</span>
        </div>
        {estimatedMinutes > 0 && (
          <Badge variant="outline">
            Est: {estimatedMinutes}m
          </Badge>
        )}
      </div>

      {/* Timer Display */}
      <div className="text-center">
        <div
          className={cn(
            "text-4xl font-mono font-bold",
            isRunning && "text-primary",
            isOvertime && "text-orange-500"
          )}
        >
          {timeDisplay}
        </div>
        {isOvertime && (
          <div className="text-sm text-orange-500 flex items-center justify-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3" />
            {overtimeMinutes}m over estimate
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {estimatedMinutes > 0 && (
        <div className="space-y-1">
          <Progress
            value={Math.min(progress, 100)}
            className={cn(isOvertime && "[&>div]:bg-orange-500")}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.floor(elapsedSeconds / 60)}m spent</span>
            <span>{estimatedMinutes}m estimated</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {!isRunning ? (
          <Button onClick={handleStart} className="gap-2">
            <Play className="h-4 w-4" />
            {elapsedSeconds > 0 ? "Resume" : "Start"}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handlePause} className="gap-2">
              <Pause className="h-4 w-4" />
              Pause
            </Button>
            <Button variant="destructive" onClick={handleStop} className="gap-2">
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </>
        )}
      </div>

      {/* Comparison */}
      {actualMinutes > 0 && !isRunning && estimatedMinutes > 0 && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Accuracy</span>
            <span
              className={cn(
                "font-medium flex items-center gap-1",
                actualMinutes <= estimatedMinutes ? "text-green-500" : "text-orange-500"
              )}
            >
              {actualMinutes <= estimatedMinutes ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {Math.abs(actualMinutes - estimatedMinutes)}m{" "}
              {actualMinutes <= estimatedMinutes ? "under" : "over"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact time comparison badge for task lists
export function TimeComparisonBadge({
  estimated,
  actual,
}: {
  estimated: number;
  actual: number;
}) {
  if (!estimated && !actual) return null;

  const diff = actual - estimated;
  const isOver = diff > 0;
  const isUnder = diff < 0;

  return (
    <div className="flex items-center gap-1 text-xs">
      {estimated > 0 && (
        <span className="text-muted-foreground">
          {estimated}m est
        </span>
      )}
      {actual > 0 && (
        <>
          <span className="text-muted-foreground">/</span>
          <span
            className={cn(
              isOver && "text-orange-500",
              isUnder && "text-green-500"
            )}
          >
            {actual}m actual
          </span>
        </>
      )}
    </div>
  );
}
