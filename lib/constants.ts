export const APP_NAME = "Bruh";
export const APP_TAGLINE = "Get your shit together.";

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

// ============================================================================
// SPRINT 2: VIEW CONSTANTS
// ============================================================================

export const VIEW_TYPES = ["list", "kanban", "calendar", "table", "matrix"] as const;
export type ViewType = (typeof VIEW_TYPES)[number];

export const KANBAN_GROUP_OPTIONS = ["status", "priority", "list"] as const;
export type KanbanGroupBy = (typeof KANBAN_GROUP_OPTIONS)[number];

export const DEFAULT_TABLE_COLUMNS = [
  "title",
  "status",
  "priority",
  "due_date",
  "estimated_minutes",
  "list",
];

export const TABLE_COLUMN_LABELS: Record<string, string> = {
  title: "Task",
  status: "Status",
  priority: "Priority",
  due_date: "Due Date",
  due_time: "Time",
  estimated_minutes: "Est.",
  actual_minutes: "Actual",
  list: "List",
  created_at: "Created",
  completed_at: "Completed",
  tags: "Tags",
};

// ============================================================================
// SPRINT 3: GAMIFICATION CONSTANTS
// ============================================================================

export const POINTS = {
  TASK_COMPLETED: 10,
  FOCUS_SESSION: 15,
  STREAK_DAY: 5,
  GOAL_COMPLETED: 50,
  HABIT_COMPLETED: 5,
  SUBTASK_COMPLETED: 3,
  EARLY_COMPLETION: 5,
  ON_TIME_COMPLETION: 3,
} as const;

export const LEVELS = [
  { level: 1, name: "Beginner", pointsRequired: 0, color: "#6b7280" },
  { level: 2, name: "Novice", pointsRequired: 100, color: "#22c55e" },
  { level: 3, name: "Focused", pointsRequired: 300, color: "#3b82f6" },
  { level: 4, name: "Dedicated", pointsRequired: 600, color: "#8b5cf6" },
  { level: 5, name: "Productive", pointsRequired: 1000, color: "#ec4899" },
  { level: 6, name: "Master", pointsRequired: 1500, color: "#f59e0b" },
  { level: 7, name: "Expert", pointsRequired: 2500, color: "#ef4444" },
  { level: 8, name: "Guru", pointsRequired: 4000, color: "#6366f1" },
  { level: 9, name: "Legend", pointsRequired: 6000, color: "#14b8a6" },
  { level: 10, name: "Bruh Master", pointsRequired: 10000, color: "#fbbf24" },
] as const;

export const ACHIEVEMENTS = {
  FIRST_TASK: {
    id: "first_task",
    name: "First Step",
    description: "Complete your first task",
    icon: "🎯",
    tiers: [1],
  },
  TASK_STREAK: {
    id: "task_streak",
    name: "Streak Master",
    description: "Maintain a daily streak",
    icon: "🔥",
    tiers: [3, 7, 14, 30, 60, 100],
  },
  FOCUS_TIME: {
    id: "focus_time",
    name: "Deep Focus",
    description: "Accumulate focus time",
    icon: "⏰",
    tiers: [60, 300, 600, 1200, 3000], // minutes
  },
  TASKS_COMPLETED: {
    id: "tasks_completed",
    name: "Task Master",
    description: "Complete tasks",
    icon: "✅",
    tiers: [10, 50, 100, 250, 500, 1000],
  },
  EARLY_BIRD: {
    id: "early_bird",
    name: "Early Bird",
    description: "Complete tasks before 9 AM",
    icon: "🌅",
    tiers: [5, 25, 50, 100],
  },
  NIGHT_OWL: {
    id: "night_owl",
    name: "Night Owl",
    description: "Complete tasks after 10 PM",
    icon: "🦉",
    tiers: [5, 25, 50, 100],
  },
  PERFECT_WEEK: {
    id: "perfect_week",
    name: "Perfect Week",
    description: "Complete all planned tasks for a week",
    icon: "🏆",
    tiers: [1, 4, 12, 26],
  },
  GOAL_GETTER: {
    id: "goal_getter",
    name: "Goal Getter",
    description: "Complete goals",
    icon: "🎯",
    tiers: [1, 5, 10, 25],
  },
  HABIT_FORMER: {
    id: "habit_former",
    name: "Habit Former",
    description: "Maintain habit streaks",
    icon: "💪",
    tiers: [7, 21, 30, 60, 90],
  },
} as const;

export const GOAL_TARGET_TYPES = [
  { value: "tasks_completed", label: "Tasks Completed", icon: "check-circle" },
  { value: "focus_minutes", label: "Focus Minutes", icon: "clock" },
  { value: "focus_sessions", label: "Focus Sessions", icon: "target" },
  { value: "streak_days", label: "Streak Days", icon: "flame" },
  { value: "custom", label: "Custom", icon: "settings" },
] as const;

export const GOAL_PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "total", label: "All Time" },
] as const;

export const HABIT_ICONS = [
  "💪", "🧘", "📚", "💧", "🏃", "🍎", "😴", "✍️", "🎯", "🧠",
  "💊", "🚶", "🏋️", "🎨", "🎵", "📝", "🌱", "☀️", "🌙", "⭐",
];

export const HABIT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#14b8a6",
];

// ============================================================================
// SPRINT 4: AI & SHORTCUTS CONSTANTS
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
  NEW_TASK: { key: "n", description: "New task", global: true },
  QUICK_CAPTURE: { key: "q", description: "Quick capture", global: true },
  SEARCH: { key: "/", description: "Search", global: true },
  COMMAND_MENU: { key: "k", meta: true, description: "Command menu", global: true },
  FOCUS_MODE: { key: "f", description: "Start focus session", global: true },
  TODAY: { key: "t", description: "Go to Today", global: true },
  COMPLETE_TASK: { key: "c", description: "Complete selected task" },
  DELETE_TASK: { key: "Backspace", description: "Delete selected task" },
  EDIT_TASK: { key: "e", description: "Edit selected task" },
  MOVE_UP: { key: "ArrowUp", description: "Move selection up" },
  MOVE_DOWN: { key: "ArrowDown", description: "Move selection down" },
  SELECT_ALL: { key: "a", meta: true, description: "Select all tasks" },
  ESCAPE: { key: "Escape", description: "Clear selection / Close" },
} as const;

// ============================================================================
// SPRINT 5: TEMPLATE CONSTANTS
// ============================================================================

export const TEMPLATE_CATEGORIES = [
  { value: "productivity", label: "Productivity", icon: "target" },
  { value: "engineering", label: "Engineering", icon: "code" },
  { value: "content", label: "Content", icon: "pen-tool" },
  { value: "marketing", label: "Marketing", icon: "megaphone" },
  { value: "personal", label: "Personal", icon: "user" },
  { value: "other", label: "Other", icon: "folder" },
] as const;

export const TEMPLATE_ICONS = [
  "file-text", "folder", "calendar", "clock", "target", "star",
  "heart", "flag", "bookmark", "briefcase", "code", "pen-tool",
  "megaphone", "rocket", "zap", "coffee", "book", "music",
] as const;
