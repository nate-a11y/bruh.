"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  ChevronUp,
  ChevronDown,
  Maximize2,
  GripHorizontal,
  ExternalLink,
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

// Check if Document Picture-in-Picture is supported
const isPiPSupported = typeof window !== "undefined" && "documentPictureInPicture" in window;

export function FloatingTimer({ onClose }: FloatingTimerProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
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

  // Open Picture-in-Picture window
  const openPiP = useCallback(async () => {
    if (!isPiPSupported) return;

    try {
      // @ts-expect-error - Document PiP API types not yet in TS
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 300,
        height: 200,
      });

      // Copy styles to PiP window
      const styleSheets = document.styleSheets;
      for (const sheet of styleSheets) {
        try {
          const cssRules = [...sheet.cssRules].map(rule => rule.cssText).join("\n");
          const style = pip.document.createElement("style");
          style.textContent = cssRules;
          pip.document.head.appendChild(style);
        } catch {
          // Skip cross-origin stylesheets
          if (sheet.href) {
            const link = pip.document.createElement("link");
            link.rel = "stylesheet";
            link.href = sheet.href;
            pip.document.head.appendChild(link);
          }
        }
      }

      // Set dark background
      pip.document.body.style.backgroundColor = "#0a0a0a";
      pip.document.body.style.margin = "0";
      pip.document.body.style.padding = "12px";
      pip.document.body.style.fontFamily = "system-ui, sans-serif";

      // Create container for React portal
      const container = pip.document.createElement("div");
      pip.document.body.appendChild(container);

      setPipWindow(pip);
      setPipContainer(container);

      // Handle PiP window close
      pip.addEventListener("pagehide", () => {
        setPipWindow(null);
        setPipContainer(null);
      });
    } catch (error) {
      console.error("Failed to open PiP:", error);
    }
  }, []);

  // Only show when timer is active
  const isActive = state === "running" || state === "paused" || state === "break";

  // Close PiP when timer stops
  useEffect(() => {
    if (!isActive && pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      setPipContainer(null);
    }
  }, [isActive, pipWindow]);

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
    <>
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
                  {isPiPSupported && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={openPiP}
                      title="Pop out (stays on top)"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  <Link href="/focus">
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Open full timer">
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

    {/* Picture-in-Picture content */}
    {pipContainer && createPortal(
      <PiPTimerContent
        state={state}
        sessionType={sessionType}
        timeRemaining={timeRemaining}
        initialTime={initialTime}
        task={task}
        pauseTimer={pauseTimer}
        resumeTimer={resumeTimer}
        stopTimer={stopTimer}
        onClose={() => pipWindow?.close()}
      />,
      pipContainer
    )}
  </>
  );
}

// Simplified timer content for PiP window
function PiPTimerContent({
  state,
  sessionType,
  timeRemaining,
  initialTime,
  task,
  pauseTimer,
  resumeTimer,
  stopTimer,
  onClose,
}: {
  state: string;
  sessionType: string;
  timeRemaining: number;
  initialTime: number;
  task: { title: string } | null;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  onClose: () => void;
}) {
  const progress = initialTime > 0 ? ((initialTime - timeRemaining) / initialTime) * 100 : 0;

  return (
    <div className="text-white">
      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
        <div
          className={cn(
            "h-full transition-all duration-500",
            sessionType === "focus" ? "bg-orange-500" : "bg-green-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Session type */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          sessionType === "focus"
            ? "bg-orange-500/20 text-orange-400"
            : "bg-green-500/20 text-green-400"
        )}>
          {sessionType === "focus" ? "Focus" : sessionType === "short_break" ? "Break" : "Long Break"}
        </span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>

      {/* Timer */}
      <div className="text-center mb-3">
        <span
          className={cn(
            "font-mono text-4xl font-bold tabular-nums",
            state === "running" && "text-orange-500",
            state === "paused" && "text-zinc-400"
          )}
        >
          {formatTimerDisplay(timeRemaining)}
        </span>
      </div>

      {/* Task name */}
      {task && (
        <p className="text-xs text-zinc-400 text-center truncate mb-3">
          {task.title}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={stopTimer}
          className="h-8 w-8 rounded-lg border border-zinc-700 hover:bg-zinc-800 flex items-center justify-center"
        >
          <Square className="h-3.5 w-3.5 text-zinc-400" />
        </button>
        {state === "paused" ? (
          <button
            onClick={resumeTimer}
            className="h-8 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium flex items-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Resume
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="h-8 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium flex items-center gap-1.5"
          >
            <Pause className="h-3.5 w-3.5" />
            Pause
          </button>
        )}
      </div>
    </div>
  );
}
