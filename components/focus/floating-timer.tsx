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
  PictureInPicture2,
  Smartphone,
  Check,
  Circle,
  X
} from "lucide-react";
import { cn, formatTimerDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTimerStore, type TimerSubtask } from "@/lib/hooks/use-timer";
import { completeTask } from "@/app/(dashboard)/actions";
import Link from "next/link";

interface FloatingTimerProps {
  onClose?: () => void;
  autoOpenPiP?: boolean;
}

// Check if Document Picture-in-Picture is supported (desktop only)
function isPiPSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "documentPictureInPicture" in window;
}

// Check if Wake Lock API is supported (works on mobile)
function isWakeLockSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "wakeLock" in navigator;
}

// Check if device is mobile
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
}

export function FloatingTimer({ onClose, autoOpenPiP = false }: FloatingTimerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const [pipSupported, setPipSupported] = useState(false);
  const [pipError, setPipError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasTriedAutoPiP = useRef(false);

  const {
    state,
    sessionType,
    timeRemaining,
    initialTime,
    task,
    subtasks,
    pauseTimer,
    resumeTimer,
    stopTimer,
    toggleSubtask,
  } = useTimerStore();

  // Handle subtask toggle with server sync
  const handleSubtaskToggle = useCallback(async (subtaskId: string) => {
    // Optimistically update local state
    toggleSubtask(subtaskId);
    // Sync to server (fire and forget)
    completeTask(subtaskId).catch(console.error);
  }, [toggleSubtask]);

  // Check PiP support and mobile on mount
  useEffect(() => {
    setPipSupported(isPiPSupported());
    setIsMobile(isMobileDevice());

    // Handle resize for mobile detection
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Wake Lock - keeps screen on during timer (especially useful for mobile)
  const requestWakeLock = useCallback(async () => {
    if (!isWakeLockSupported()) return false;

    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setWakeLockActive(true);

      // Re-acquire on visibility change (when user returns to tab)
      wakeLockRef.current.addEventListener("release", () => {
        setWakeLockActive(false);
      });

      return true;
    } catch (err) {
      console.error("Wake Lock error:", err);
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  // Auto-acquire wake lock when timer is running
  useEffect(() => {
    if (state === "running") {
      requestWakeLock();
    } else if (state === "idle") {
      releaseWakeLock();
    }
  }, [state, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && state === "running") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [state, requestWakeLock]);

  // Toggle mobile fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Open Picture-in-Picture window
  const openPiP = useCallback(async () => {
    if (!isPiPSupported()) {
      setPipError("Your browser doesn't support Picture-in-Picture");
      return false;
    }

    try {
      // Close existing PiP window if any
      if (pipWindow) {
        pipWindow.close();
      }

      // @ts-expect-error - Document PiP API types not yet in TS
      const pip: Window = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 220,
        disallowReturnToOpener: false,
      });

      // Set up the PiP document
      pip.document.documentElement.style.colorScheme = "dark";

      // Add basic styles directly
      const style = pip.document.createElement("style");
      style.textContent = `
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: #0a0a0a;
          color: white;
          padding: 16px;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .progress-bar {
          height: 4px;
          background: #27272a;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .progress-fill {
          height: 100%;
          transition: width 0.5s ease;
        }
        .progress-fill.focus { background: #f97316; }
        .progress-fill.break { background: #22c55e; }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .badge {
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 9999px;
        }
        .badge.focus { background: rgba(249,115,22,0.2); color: #fb923c; }
        .badge.break { background: rgba(34,197,94,0.2); color: #4ade80; }
        .close-btn {
          background: none;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 4px;
          font-size: 14px;
        }
        .close-btn:hover { color: white; }
        .timer {
          text-align: center;
          font-family: ui-monospace, monospace;
          font-size: 48px;
          font-weight: 700;
          letter-spacing: -2px;
          margin: 8px 0;
        }
        .timer.running { color: #f97316; }
        .timer.paused { color: #71717a; }
        .task-name {
          text-align: center;
          font-size: 12px;
          color: #a1a1aa;
          margin-bottom: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .controls {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: auto;
        }
        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.15s;
        }
        .btn-icon {
          width: 36px;
          height: 36px;
          background: transparent;
          border: 1px solid #3f3f46;
          color: #a1a1aa;
        }
        .btn-icon:hover { background: #27272a; color: white; }
        .btn-primary {
          height: 36px;
          padding: 0 16px;
          background: #f97316;
          color: white;
        }
        .btn-primary:hover { background: #ea580c; }
        .btn-primary.paused { background: #22c55e; }
        .btn-primary.paused:hover { background: #16a34a; }
        svg {
          width: 16px;
          height: 16px;
        }
      `;
      pip.document.head.appendChild(style);

      // Create container for content
      const container = pip.document.createElement("div");
      container.id = "pip-root";
      pip.document.body.appendChild(container);

      setPipWindow(pip);
      setPipContainer(container);
      setPipError(null);

      // Handle PiP window close
      pip.addEventListener("pagehide", () => {
        setPipWindow(null);
        setPipContainer(null);
      });

      return true;
    } catch (error) {
      console.error("Failed to open PiP:", error);
      setPipError(error instanceof Error ? error.message : "Failed to open Picture-in-Picture");
      return false;
    }
  }, [pipWindow]);

  // Only show when timer is active
  const isActive = state === "running" || state === "paused" || state === "break";

  // Auto-open PiP when timer becomes active (only once per session)
  useEffect(() => {
    if (autoOpenPiP && isActive && !pipWindow && !hasTriedAutoPiP.current && pipSupported) {
      hasTriedAutoPiP.current = true;
      // Small delay to ensure user gesture context is available
      const timer = setTimeout(() => {
        openPiP();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoOpenPiP, isActive, pipWindow, pipSupported, openPiP]);

  // Reset auto-PiP flag when timer stops
  useEffect(() => {
    if (!isActive) {
      hasTriedAutoPiP.current = false;
    }
  }, [isActive]);

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

  // Don't render in-browser widget if PiP is open
  if (pipWindow && pipContainer) {
    return createPortal(
      <PiPTimerContent
        state={state}
        sessionType={sessionType}
        timeRemaining={timeRemaining}
        initialTime={initialTime}
        task={task}
        subtasks={subtasks}
        pauseTimer={pauseTimer}
        resumeTimer={resumeTimer}
        stopTimer={stopTimer}
        onSubtaskToggle={handleSubtaskToggle}
        onClose={() => pipWindow.close()}
      />,
      pipContainer
    );
  }

  if (!isActive) return null;

  // Mobile fullscreen mode
  if (isFullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6"
      >
        {/* Progress bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted">
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

        {/* Close button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-4 right-4 h-10 w-10"
          onClick={() => setIsFullscreen(false)}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Wake lock indicator */}
        {wakeLockActive && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Screen stays on
          </div>
        )}

        {/* Session type badge */}
        <span className={cn(
          "text-sm font-medium px-4 py-1.5 rounded-full mb-6",
          sessionType === "focus"
            ? "bg-primary/10 text-primary"
            : "bg-green-500/10 text-green-500"
        )}>
          {sessionType === "focus" ? "Focus Session" : sessionType === "short_break" ? "Short Break" : "Long Break"}
        </span>

        {/* Big timer */}
        <div
          className={cn(
            "font-mono text-7xl sm:text-8xl font-bold tabular-nums mb-4",
            state === "running" && "text-primary",
            state === "paused" && "text-muted-foreground"
          )}
        >
          {formatTimerDisplay(timeRemaining)}
        </div>

        {/* Task name */}
        {task && (
          <p className="text-lg text-muted-foreground mb-4 max-w-xs text-center">
            {task.title}
          </p>
        )}

        {/* Subtasks checklist */}
        {subtasks.length > 0 && (
          <div className="w-full max-w-xs mb-8 space-y-2 max-h-40 overflow-y-auto">
            {subtasks.map((subtask) => (
              <button
                key={subtask.id}
                onClick={() => handleSubtaskToggle(subtask.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors",
                  subtask.status === "completed"
                    ? "bg-green-500/10 opacity-60"
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                {subtask.status === "completed" ? (
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <span className={cn(
                  "text-sm truncate",
                  subtask.status === "completed" && "line-through"
                )}>
                  {subtask.title}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            variant="outline"
            className="h-14 w-14"
            onClick={stopTimer}
          >
            <Square className="h-6 w-6" />
          </Button>
          {state === "paused" ? (
            <Button size="lg" className="h-14 px-8" onClick={resumeTimer}>
              <Play className="h-6 w-6 mr-2" />
              Resume
            </Button>
          ) : (
            <Button size="lg" className="h-14 px-8" onClick={pauseTimer}>
              <Pause className="h-6 w-6 mr-2" />
              Pause
            </Button>
          )}
        </div>

        {/* Tip */}
        <p className="absolute bottom-6 text-xs text-muted-foreground text-center">
          {wakeLockActive ? "Your screen will stay on while the timer runs" : "Tap the timer to exit fullscreen"}
        </p>
      </motion.div>
    );
  }

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
                  {/* Desktop: PiP button, Mobile: Fullscreen button */}
                  {pipSupported && !isMobile && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={openPiP}
                      title="Pop out window (stays on top of other apps)"
                    >
                      <PictureInPicture2 className="h-3 w-3" />
                    </Button>
                  )}
                  {isMobile && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={toggleFullscreen}
                      title="Fullscreen timer"
                    >
                      <Smartphone className="h-3 w-3" />
                    </Button>
                  )}
                  <Link href="/focus">
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Open full timer">
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* PiP Error */}
              {pipError && (
                <p className="text-xs text-red-400 text-center">{pipError}</p>
              )}

              {/* Wake lock indicator (mobile) */}
              {isMobile && wakeLockActive && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Screen on
                </div>
              )}

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

              {/* Subtasks checklist */}
              {subtasks.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {subtasks.map((subtask) => (
                    <button
                      key={subtask.id}
                      onClick={() => handleSubtaskToggle(subtask.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs transition-colors hover:bg-muted/50",
                        subtask.status === "completed" && "opacity-50"
                      )}
                    >
                      {subtask.status === "completed" ? (
                        <Check className="h-3 w-3 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <span className={cn(
                        "truncate",
                        subtask.status === "completed" && "line-through"
                      )}>
                        {subtask.title}
                      </span>
                    </button>
                  ))}
                </div>
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

// Simplified timer content for PiP window (vanilla HTML/JS - no React)
function PiPTimerContent({
  state,
  sessionType,
  timeRemaining,
  initialTime,
  task,
  subtasks,
  pauseTimer,
  resumeTimer,
  stopTimer,
  onSubtaskToggle,
  onClose,
}: {
  state: string;
  sessionType: string;
  timeRemaining: number;
  initialTime: number;
  task: { title: string } | null;
  subtasks: TimerSubtask[];
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  onSubtaskToggle: (id: string) => void;
  onClose: () => void;
}) {
  const progress = initialTime > 0 ? ((initialTime - timeRemaining) / initialTime) * 100 : 0;
  const isFocus = sessionType === "focus";
  const isPaused = state === "paused";

  // SVG icons as strings
  const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
  const stopIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`;
  const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const circleIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;

  // Generate subtask HTML
  const subtasksHtml = subtasks.length > 0 ? `
    <div class="subtasks">
      ${subtasks.map(st => `
        <button class="subtask-btn" data-id="${st.id}" data-status="${st.status}">
          <span class="subtask-icon">${st.status === 'completed' ? checkIcon : circleIcon}</span>
          <span class="subtask-title ${st.status === 'completed' ? 'completed' : ''}">${st.title}</span>
        </button>
      `).join('')}
    </div>
  ` : '';

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      dangerouslySetInnerHTML={{
        __html: `
          <style>
            .subtasks {
              max-height: 80px;
              overflow-y: auto;
              margin-bottom: 8px;
            }
            .subtask-btn {
              display: flex;
              align-items: center;
              gap: 6px;
              width: 100%;
              padding: 4px 8px;
              background: transparent;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              text-align: left;
              color: #a1a1aa;
              font-size: 11px;
              transition: background 0.15s;
            }
            .subtask-btn:hover { background: #27272a; }
            .subtask-btn[data-status="completed"] { opacity: 0.5; }
            .subtask-icon { width: 12px; height: 12px; flex-shrink: 0; }
            .subtask-icon svg { width: 12px; height: 12px; }
            .subtask-btn[data-status="completed"] .subtask-icon { color: #22c55e; }
            .subtask-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .subtask-title.completed { text-decoration: line-through; }
          </style>
          <div class="progress-bar">
            <div class="progress-fill ${isFocus ? 'focus' : 'break'}" style="width: ${progress}%"></div>
          </div>

          <div class="header">
            <span class="badge ${isFocus ? 'focus' : 'break'}">
              ${isFocus ? 'Focus' : sessionType === 'short_break' ? 'Break' : 'Long Break'}
            </span>
            <button class="close-btn" onclick="window.close()">✕</button>
          </div>

          <div class="timer ${state === 'running' ? 'running' : 'paused'}">
            ${formatTimerDisplay(timeRemaining)}
          </div>

          ${task ? `<div class="task-name">${task.title}</div>` : ''}

          ${subtasksHtml}

          <div class="controls">
            <button class="btn btn-icon" id="stop-btn">${stopIcon}</button>
            <button class="btn btn-primary ${isPaused ? 'paused' : ''}" id="toggle-btn">
              ${isPaused ? playIcon : pauseIcon}
              ${isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        `
      }}
      ref={(el) => {
        if (el) {
          const stopBtn = el.querySelector('#stop-btn');
          const toggleBtn = el.querySelector('#toggle-btn');
          const subtaskBtns = el.querySelectorAll('.subtask-btn');

          if (stopBtn) {
            stopBtn.addEventListener('click', () => {
              stopTimer();
              onClose();
            });
          }

          if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
              if (isPaused) {
                resumeTimer();
              } else {
                pauseTimer();
              }
            });
          }

          subtaskBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
              const id = btn.getAttribute('data-id');
              if (id) onSubtaskToggle(id);
            });
          });
        }
      }}
    />
  );
}
