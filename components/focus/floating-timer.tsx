"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  ChevronUp,
  ChevronDown,
  Maximize2,
  GripHorizontal,
  X
} from "lucide-react";
import { cn, formatTimerDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTimerStore } from "@/lib/hooks/use-timer";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FloatingTimerProps {
  onClose?: () => void;
}

export function FloatingTimer({ onClose }: FloatingTimerProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const {
    state,
    sessionType,
    timeRemaining,
    initialTime,
    task,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useTimerStore();

  // Only show when timer is active
  const isActive = state === "running" || state === "paused" || state === "break";

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  // Handle drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      const newX = Math.max(0, Math.min(window.innerWidth - 200, dragStartRef.current.posX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, dragStartRef.current.posY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Calculate progress
  const progress = initialTime > 0 ? ((initialTime - timeRemaining) / initialTime) * 100 : 0;

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={dragRef}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className={cn(
          "fixed z-50 bg-card border rounded-xl shadow-2xl",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          "select-none"
        )}
        style={{
          left: position.x,
          bottom: position.y,
        }}
      >
        {/* Progress bar at top */}
        <div className="h-1 bg-muted rounded-t-xl overflow-hidden">
          <motion.div
            className={cn(
              "h-full",
              sessionType === "focus" ? "bg-primary" : "bg-green-500"
            )}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Drag handle */}
        <div
          className="flex items-center justify-center py-1 border-b border-border/50 hover:bg-muted/50 transition-colors"
          onMouseDown={handleMouseDown}
        >
          <GripHorizontal className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="p-3">
          {isCollapsed ? (
            // Collapsed view - just timer
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "font-mono text-lg font-bold tabular-nums",
                  state === "running" && "text-primary"
                )}
              >
                {formatTimerDisplay(timeRemaining)}
              </span>
              <div className="flex items-center gap-1">
                {state === "paused" ? (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resumeTimer}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={pauseTimer}>
                    <Pause className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsCollapsed(false)}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            // Expanded view
            <div className="space-y-3 min-w-[200px]">
              {/* Session type badge */}
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  sessionType === "focus"
                    ? "bg-primary/10 text-primary"
                    : "bg-green-500/10 text-green-500"
                )}>
                  {sessionType === "focus" ? "Focus" : sessionType === "short_break" ? "Break" : "Long Break"}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setIsCollapsed(true)}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Link href="/focus">
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Timer display */}
              <div className="text-center">
                <span
                  className={cn(
                    "font-mono text-3xl font-bold tabular-nums",
                    state === "running" && "text-primary",
                    state === "paused" && "opacity-70"
                  )}
                >
                  {formatTimerDisplay(timeRemaining)}
                </span>
              </div>

              {/* Task name */}
              {task && (
                <p className="text-xs text-muted-foreground text-center truncate px-2">
                  {task.title}
                </p>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={stopTimer}
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
                {state === "paused" ? (
                  <Button size="sm" className="h-8 px-4" onClick={resumeTimer}>
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Resume
                  </Button>
                ) : (
                  <Button size="sm" className="h-8 px-4" onClick={pauseTimer}>
                    <Pause className="h-3.5 w-3.5 mr-1.5" />
                    Pause
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
