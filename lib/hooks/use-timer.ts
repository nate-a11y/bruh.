"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task } from "@/lib/supabase/types";

export type TimerState = "idle" | "running" | "paused" | "break" | "completed";
export type SessionType = "focus" | "short_break" | "long_break";

interface TimerStore {
  state: TimerState;
  sessionType: SessionType;
  timeRemaining: number;
  initialTime: number;
  task: Task | null;
  sessionsCompleted: number;
  soundEnabled: boolean;

  // Actions
  startTimer: (task: Task | null, durationMinutes: number) => void;
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
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      state: "idle",
      sessionType: "focus",
      timeRemaining: 0,
      initialTime: 0,
      task: null,
      sessionsCompleted: 0,
      soundEnabled: true,

      startTimer: (task, durationMinutes) => {
        const seconds = durationMinutes * 60;
        set({
          state: "running",
          sessionType: "focus",
          timeRemaining: seconds,
          initialTime: seconds,
          task,
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
        });
      },

      pauseTimer: () => {
        set({ state: "paused" });
      },

      resumeTimer: () => {
        const { sessionType } = get();
        set({ state: sessionType === "focus" ? "running" : "break" });
      },

      stopTimer: () => {
        set({
          state: "idle",
          sessionType: "focus",
          timeRemaining: 0,
          initialTime: 0,
          task: null,
        });
      },

      completeTimer: () => {
        set({ state: "completed" });
      },

      tick: () => {
        const { timeRemaining, state } = get();
        if ((state === "running" || state === "break") && timeRemaining > 0) {
          set({ timeRemaining: timeRemaining - 1 });
        }
        if ((state === "running" || state === "break") && timeRemaining <= 1) {
          set({ state: "completed" });
        }
      },

      reset: () => {
        set({
          state: "idle",
          sessionType: "focus",
          timeRemaining: 0,
          initialTime: 0,
          task: null,
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
    }),
    {
      name: "zeroed-timer",
      partialize: (state) => ({
        soundEnabled: state.soundEnabled,
        sessionsCompleted: state.sessionsCompleted,
      }),
    }
  )
);
