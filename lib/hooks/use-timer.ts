"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task } from "@/lib/supabase/types";

export type TimerState = "idle" | "running" | "paused" | "break" | "completed";
export type SessionType = "focus" | "short_break" | "long_break";

// Simplified subtask for timer display
export interface TimerSubtask {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
}

interface TimerStore {
  state: TimerState;
  sessionType: SessionType;
  timeRemaining: number;
  initialTime: number;
  task: Task | null;
  subtasks: TimerSubtask[];
  sessionsCompleted: number;
  soundEnabled: boolean;
  // Track when timer was last updated (for calculating elapsed time on refresh)
  lastTickAt: number | null;

  // Actions
  startTimer: (task: Task | null, durationMinutes: number, subtasks?: TimerSubtask[]) => void;
  startBreak: (type: "short_break" | "long_break", durationMinutes: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  completeTimer: () => void;
  tick: () => void;
  reset: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  incrementSessions: () => void;
  resetSessions: () => void;
  // Subtask management
  setSubtasks: (subtasks: TimerSubtask[]) => void;
  toggleSubtask: (subtaskId: string) => void;
  // Hydration helper
  hydrateTimer: () => void;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      state: "idle",
      sessionType: "focus",
      timeRemaining: 0,
      initialTime: 0,
      task: null,
      subtasks: [],
      sessionsCompleted: 0,
      soundEnabled: true,
      lastTickAt: null,

      startTimer: (task, durationMinutes, subtasks = []) => {
        const seconds = durationMinutes * 60;
        set({
          state: "running",
          sessionType: "focus",
          timeRemaining: seconds,
          initialTime: seconds,
          task,
          subtasks,
          lastTickAt: Date.now(),
        });
      },

      startBreak: (type, durationMinutes) => {
        const seconds = durationMinutes * 60;
        set({
          state: "break",
          sessionType: type,
          timeRemaining: seconds,
          initialTime: seconds,
          task: null,
          lastTickAt: Date.now(),
        });
      },

      pauseTimer: () => {
        set({ state: "paused", lastTickAt: null });
      },

      resumeTimer: () => {
        const { sessionType } = get();
        set({
          state: sessionType === "focus" ? "running" : "break",
          lastTickAt: Date.now(),
        });
      },

      stopTimer: () => {
        set({
          state: "idle",
          sessionType: "focus",
          timeRemaining: 0,
          initialTime: 0,
          task: null,
          subtasks: [],
          lastTickAt: null,
        });
      },

      completeTimer: () => {
        set({ state: "completed", lastTickAt: null });
      },

      tick: () => {
        const { timeRemaining, state } = get();
        if ((state === "running" || state === "break") && timeRemaining > 0) {
          set({ timeRemaining: timeRemaining - 1, lastTickAt: Date.now() });
        }
        if ((state === "running" || state === "break") && timeRemaining <= 1) {
          set({ state: "completed", lastTickAt: null });
        }
      },

      reset: () => {
        set({
          state: "idle",
          sessionType: "focus",
          timeRemaining: 0,
          initialTime: 0,
          task: null,
          subtasks: [],
          lastTickAt: null,
        });
      },

      setSoundEnabled: (enabled) => {
        set({ soundEnabled: enabled });
      },

      incrementSessions: () => {
        set((state) => ({ sessionsCompleted: state.sessionsCompleted + 1 }));
      },

      resetSessions: () => {
        set({ sessionsCompleted: 0 });
      },

      setSubtasks: (subtasks) => {
        set({ subtasks });
      },

      toggleSubtask: (subtaskId) => {
        const { subtasks } = get();
        set({
          subtasks: subtasks.map((st) =>
            st.id === subtaskId
              ? { ...st, status: st.status === "completed" ? "pending" : "completed" }
              : st
          ),
        });
      },

      // Called on app load to recalculate time after page refresh
      hydrateTimer: () => {
        const { state, lastTickAt, timeRemaining } = get();

        // Only adjust if timer was running and we have a timestamp
        if ((state === "running" || state === "break") && lastTickAt) {
          const elapsedSeconds = Math.floor((Date.now() - lastTickAt) / 1000);
          const newTimeRemaining = Math.max(0, timeRemaining - elapsedSeconds);

          if (newTimeRemaining <= 0) {
            // Timer completed while page was closed
            set({ state: "completed", timeRemaining: 0, lastTickAt: null });
          } else {
            set({ timeRemaining: newTimeRemaining, lastTickAt: Date.now() });
          }
        }
      },
    }),
    {
      name: "bruh-timer",
      // Persist full timer state for recovery after refresh
      partialize: (state) => ({
        state: state.state,
        sessionType: state.sessionType,
        timeRemaining: state.timeRemaining,
        initialTime: state.initialTime,
        task: state.task,
        subtasks: state.subtasks,
        sessionsCompleted: state.sessionsCompleted,
        soundEnabled: state.soundEnabled,
        lastTickAt: state.lastTickAt,
      }),
    }
  )
);
