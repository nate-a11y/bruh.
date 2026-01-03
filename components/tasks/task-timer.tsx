"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaskTimerProps {
  taskId: string;
  taskTitle: string;
  initialMinutes?: number;
  onTimeUpdate?: (minutes: number) => void;
  compact?: boolean;
}

export function TaskTimer({
  taskId,
  taskTitle,
  initialMinutes = 0,
  onTimeUpdate,
  compact = false,
}: TaskTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialMinutes * 60);
  const [sessionStartSeconds, setSessionStartSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - (elapsedSeconds - sessionStartSeconds) * 1000;

      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = Date.now();
          const newElapsed = sessionStartSeconds + Math.floor((now - startTimeRef.current) / 1000);
          setElapsedSeconds(newElapsed);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, sessionStartSeconds]);

  const handleStart = () => {
    setSessionStartSeconds(elapsedSeconds);
    setIsRunning(true);
    toast.info(`Timer started for "${taskTitle}"`);
  };

  const handlePause = () => {
    setIsRunning(false);
    const minutes = Math.floor(elapsedSeconds / 60);
    onTimeUpdate?.(minutes);
  };

  const handleStop = () => {
    setIsRunning(false);
    const minutes = Math.floor(elapsedSeconds / 60);
    onTimeUpdate?.(minutes);
    toast.success(`Logged ${formatTime(elapsedSeconds)} for "${taskTitle}"`);
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", isRunning && "text-primary")}
          onClick={isRunning ? handlePause : handleStart}
        >
          {isRunning ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        {(isRunning || elapsedSeconds > 0) && (
          <span
            className={cn(
              "text-xs tabular-nums",
              isRunning && "text-primary font-medium"
            )}
          >
            {formatTime(elapsedSeconds)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
      <Clock className="h-4 w-4 text-muted-foreground" />

      <span
        className={cn(
          "font-mono text-lg tabular-nums min-w-[80px]",
          isRunning && "text-primary font-semibold"
        )}
      >
        {formatTime(elapsedSeconds)}
      </span>

      <div className="flex items-center gap-1 ml-auto">
        {!isRunning ? (
          <Button variant="ghost" size="sm" onClick={handleStart}>
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={handlePause}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
            <Button variant="ghost" size="sm" onClick={handleStop}>
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
