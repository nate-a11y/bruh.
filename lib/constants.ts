export const APP_NAME = "Zeroed";
export const APP_TAGLINE = "Zero in. Get it done.";

export const DEFAULT_FOCUS_MINUTES = 25;
export const DEFAULT_SHORT_BREAK_MINUTES = 5;
export const DEFAULT_LONG_BREAK_MINUTES = 15;
export const SESSIONS_BEFORE_LONG_BREAK = 4;

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const SESSION_TYPES = ["focus", "short_break", "long_break"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const THEMES = ["dark", "light", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-warning",
  urgent: "text-destructive",
};

export const LIST_COLORS = [
  "#6366f1", // Electric indigo (default)
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
];
