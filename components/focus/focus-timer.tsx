"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Square, SkipForward, ChevronDown, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { cn, formatTimerDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTimerStore } from "@/lib/hooks/use-timer";
import { createFocusSession, completeFocusSession } from "@/app/(dashboard)/actions";
import { FocusCompleteModal } from "./focus-complete-modal";
import { playTimerEndSound } from "@/lib/sounds";
import type { Task } from "@/lib/supabase/types";

type TaskWithList = Task & { zeroed_lists?: { name: string; color: string } | null };

interface FocusTimerProps {
  tasks: TaskWithList[];
  defaultFocusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  soundEnabled: boolean;
}

export function FocusTimer({
  tasks,
  defaultFocusMinutes,
  shortBreakMinutes,
  longBreakMinutes,
  sessionsBeforeLongBreak,
  soundEnabled: initialSoundEnabled,
}: FocusTimerProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const {
    state,
    sessionType,
    timeRemaining,
    initialTime,
    task,
    sessionsCompleted,
    soundEnabled,
    startTimer,
    startBreak,
    pauseTimer,
    resumeTimer,
    stopTimer,
    completeTimer,
    tick,
    reset,
    setSoundEnabled,
    incrementSessions,
  } = useTimerStore();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithList | null>(task as TaskWithList | null);
  const [mounted, setMounted] = useState(false);

  // Initialize sound setting
  useEffect(() => {
    setSoundEnabled(initialSoundEnabled);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, [initialSoundEnabled, setSoundEnabled]);

  // Update tab title when timer is running
  useEffect(() => {
    if (state === "running" || state === "break" || state === "paused") {
      const prefix = state === "paused" ? "⏸ " : sessionType === "focus" ? "🎯 " : "☕ ";
      const time = formatTimerDisplay(timeRemaining);
      const taskName = selectedTask ? ` - ${selectedTask.title}` : "";
      document.title = `${prefix}${time}${taskName} | Bruh`;
    } else {
      document.title = "Focus Mode | Bruh";
    }

    return () => {
      document.title = "Focus Mode | Bruh";
    };
  }, [state, timeRemaining, sessionType, selectedTask]);

  // Warn before leaving when timer is running
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (state === "running" || state === "break") {
        e.preventDefault();
        e.returnValue = "You have a focus session in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state]);

  // Sync selected task with store
  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTask(task as TaskWithList);
    }
  }, [task]);

  // Timer tick effect
  useEffect(() => {
    if (state === "running" || state === "break") {
      intervalRef.current = setInterval(() => {
        tick();
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
  }, [state, tick]);

  // Handle timer completion
  useEffect(() => {
    if (state === "completed") {
      if (soundEnabled) {
        playTimerEndSound();
      }
      if (sessionType === "focus") {
        incrementSessions();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowCompleteModal(true);
        // Save session
        if (sessionIdRef.current && startTimeRef.current) {
          const actualMinutes = Math.ceil(
            (Date.now() - startTimeRef.current.getTime()) / 1000 / 60
          );
          completeFocusSession(
            sessionIdRef.current,
            actualMinutes,
            selectedTask?.id
          );
        }
      } else {
        // Break completed
        toast.success("Break over! Ready to focus?");
        reset();
      }
    }
  }, [state, sessionType, soundEnabled, selectedTask, incrementSessions, reset]);

  // Handler functions using useCallback to avoid hoisting issues
  const handleStop = useCallback(() => {
    if (sessionIdRef.current && startTimeRef.current && sessionType === "focus") {
      const actualMinutes = Math.ceil(
        (Date.now() - startTimeRef.current.getTime()) / 1000 / 60
      );
      completeFocusSession(
        sessionIdRef.current,
        actualMinutes,
        selectedTask?.id
      );
    }
    stopTimer();
    sessionIdRef.current = null;
    startTimeRef.current = null;
  }, [sessionType, selectedTask?.id, stopTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (state === "running" || state === "break") {
          pauseTimer();
        } else if (state === "paused") {
          resumeTimer();
        }
      }
      if (e.code === "Escape") {
        e.preventDefault();
        if (state !== "idle" && state !== "completed") {
          handleStop();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, pauseTimer, resumeTimer, handleStop]);

  async function handleStart() {
    if (!selectedTask && tasks.length > 0) {
      toast.error("Select a task to focus on");
      return;
    }

    startTimer(selectedTask, defaultFocusMinutes);
    startTimeRef.current = new Date();

    // Create session in database
    const result = await createFocusSession(selectedTask?.id || null, defaultFocusMinutes);
    if (result.session) {
      sessionIdRef.current = result.session.id;
    }
  }

  function handleStartBreak() {
    const isLongBreak =
      (sessionsCompleted + 1) % sessionsBeforeLongBreak === 0;
    startBreak(
      isLongBreak ? "long_break" : "short_break",
      isLongBreak ? longBreakMinutes : shortBreakMinutes
    );
    setShowCompleteModal(false);
  }

  function handleContinue() {
    reset();
    setShowCompleteModal(false);
    // Start another focus session
    handleStart();
  }

  function handleModalClose() {
    reset();
    setShowCompleteModal(false);
  }

  const progress =
    initialTime > 0 ? ((initialTime - timeRemaining) / initialTime) * 100 : 0;

  const isActive = state !== "idle" && state !== "completed";

  if (!mounted) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        {/* Task Selector */}
        <div className="w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isActive}>
              <Button
                variant="outline"
                className="w-full justify-between h-12"
                disabled={isActive}
              >
                {selectedTask ? (
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          selectedTask.zeroed_lists?.color || "#6366f1",
                      }}
                    />
                    <span className="truncate">{selectedTask.title}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    Select a task to focus on...
                  </span>
                )}
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[calc(100vw-3rem)] max-w-md max-h-[300px] overflow-auto">
              <DropdownMenuItem onClick={() => setSelectedTask(null)}>
                <span className="text-muted-foreground">No task (free focus)</span>
              </DropdownMenuItem>
              {tasks.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: t.zeroed_lists?.color || "#6366f1",
                      }}
                    />
                    <span className="truncate">{t.title}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Timer Display */}
        <div className="relative w-64 h-64">
          {/* Progress Ring */}
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className={cn(
                "transition-colors",
                sessionType === "focus" ? "text-primary" : "text-success"
              )}
              style={{
                strokeDasharray: 2 * Math.PI * 45,
                strokeDashoffset: 2 * Math.PI * 45 * (1 - progress / 100),
              }}
              initial={false}
              animate={{
                strokeDashoffset: 2 * Math.PI * 45 * (1 - progress / 100),
              }}
              transition={{ duration: 0.5 }}
            />
          </svg>

          {/* Time Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={timeRemaining}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "font-mono text-5xl font-bold tracking-wider",
                  state === "running" && "animate-pulse"
                )}
              >
                {formatTimerDisplay(timeRemaining)}
              </motion.div>
            </AnimatePresence>
            <p className="text-sm text-muted-foreground mt-2 capitalize">
              {sessionType === "focus"
                ? "Focus Time"
                : sessionType === "short_break"
                ? "Short Break"
                : "Long Break"}
            </p>
          </div>
        </div>

        {/* Session Counter */}
        <div className="flex items-center gap-2">
          {Array.from({ length: sessionsBeforeLongBreak }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i < (sessionsCompleted % sessionsBeforeLongBreak)
                  ? "bg-primary"
                  : "bg-muted"
              )}
            />
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {sessionsCompleted} sessions today
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {state === "idle" ? (
            <Button size="lg" className="h-14 w-32" onClick={handleStart}>
              <Play className="h-6 w-6 mr-2" />
              Start
            </Button>
          ) : (
            <>
              <Button variant="outline" size="icon" className="h-12 w-12" onClick={handleStop}>
                <Square className="h-5 w-5" />
              </Button>

              {state === "paused" ? (
                <Button size="lg" className="h-14 w-32" onClick={resumeTimer}>
                  <Play className="h-6 w-6 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button size="lg" className="h-14 w-32" onClick={pauseTimer}>
                  <Pause className="h-6 w-6 mr-2" />
                  Pause
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => {
                  if (sessionType === "focus") {
                    completeTimer();
                  } else {
                    reset();
                  }
                }}
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>

        {/* Sound Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-muted-foreground"
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4 mr-2" />
          ) : (
            <VolumeX className="h-4 w-4 mr-2" />
          )}
          Sound {soundEnabled ? "On" : "Off"}
        </Button>

        {/* Keyboard Hints */}
        <p className="text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 rounded bg-muted">Space</kbd> to
          pause/resume •{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd> to stop
        </p>
      </div>

      {/* Completion Modal */}
      <FocusCompleteModal
        open={showCompleteModal}
        onClose={handleModalClose}
        onStartBreak={handleStartBreak}
        onContinue={handleContinue}
        task={selectedTask}
        sessionsCompleted={sessionsCompleted}
        isLongBreak={(sessionsCompleted + 1) % sessionsBeforeLongBreak === 0}
      />
    </>
  );
}
