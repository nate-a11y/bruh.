# Zeroed Sprint 7 — Raycast Extension

## Overview

Native Raycast extension for lightning-fast task management:
1. **Quick Capture** — Add tasks from anywhere with a hotkey
2. **Today View** — See and manage today's tasks
3. **Focus Launcher** — Start focus sessions instantly
4. **Natural Language** — Parse "Call mom tomorrow 3pm" into structured tasks
5. **Menu Bar** — Always-visible task count and quick actions
6. **Deep Links** — Open specific views in the web app

---

## Phase 0: Project Setup

### 0.1 Create Extension

```bash
# Install Raycast CLI
npm install -g @raycast/api

# Create extension
npx create-raycast-extension zeroed-raycast --template empty
cd zeroed-raycast

# Install dependencies
npm install @supabase/supabase-js date-fns
```

### 0.2 Project Structure

```
zeroed-raycast/
├── package.json
├── tsconfig.json
├── assets/
│   ├── icon.png              # 512x512 extension icon
│   ├── command-icon.png      # 64x64 command icons
│   └── menu-bar-icon.png     # 22x22 menu bar icon
├── src/
│   ├── add-task.tsx          # Quick capture command
│   ├── add-task-nl.tsx       # Natural language capture
│   ├── today.tsx             # Today's tasks list
│   ├── all-tasks.tsx         # All tasks with search
│   ├── lists.tsx             # View lists
│   ├── start-focus.tsx       # Focus session launcher
│   ├── menu-bar.tsx          # Menu bar command
│   ├── utils/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── api.ts            # API functions
│   │   ├── parse.ts          # Natural language parsing
│   │   └── constants.ts      # Shared constants
│   └── types.ts              # TypeScript types
```

### 0.3 Package Configuration

**package.json**:
```json
{
  "name": "zeroed",
  "title": "Zeroed",
  "description": "Zero your tasks. Focus on what matters.",
  "icon": "icon.png",
  "author": "Nate",
  "categories": ["Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "add-task",
      "title": "Add Task",
      "subtitle": "Zeroed",
      "description": "Quickly add a new task",
      "mode": "view",
      "keywords": ["task", "todo", "add", "create", "new"]
    },
    {
      "name": "add-task-nl",
      "title": "Quick Add (Natural Language)",
      "subtitle": "Zeroed",
      "description": "Add task with natural language parsing",
      "mode": "view",
      "keywords": ["quick", "natural", "smart"]
    },
    {
      "name": "today",
      "title": "Today's Tasks",
      "subtitle": "Zeroed",
      "description": "View and manage today's tasks",
      "mode": "view",
      "keywords": ["today", "tasks", "list", "daily"]
    },
    {
      "name": "all-tasks",
      "title": "All Tasks",
      "subtitle": "Zeroed",
      "description": "Search and manage all tasks",
      "mode": "view",
      "keywords": ["all", "search", "find"]
    },
    {
      "name": "lists",
      "title": "Lists",
      "subtitle": "Zeroed",
      "description": "View tasks by list",
      "mode": "view",
      "keywords": ["lists", "projects", "categories"]
    },
    {
      "name": "start-focus",
      "title": "Start Focus Session",
      "subtitle": "Zeroed",
      "description": "Start a focus session on a task",
      "mode": "view",
      "keywords": ["focus", "pomodoro", "timer", "start"]
    },
    {
      "name": "menu-bar",
      "title": "Zeroed Menu Bar",
      "subtitle": "Zeroed",
      "description": "Quick access from menu bar",
      "mode": "menu-bar",
      "interval": "10m",
      "keywords": ["menu", "bar"]
    }
  ],
  "preferences": [
    {
      "name": "supabaseUrl",
      "title": "Supabase URL",
      "description": "Your Supabase project URL",
      "type": "textfield",
      "required": true,
      "placeholder": "https://xxx.supabase.co"
    },
    {
      "name": "supabaseAnonKey",
      "title": "Supabase Anon Key",
      "description": "Your Supabase anonymous key",
      "type": "password",
      "required": true
    },
    {
      "name": "accessToken",
      "title": "Access Token",
      "description": "Your Zeroed authentication token (get from Settings)",
      "type": "password",
      "required": true
    },
    {
      "name": "webAppUrl",
      "title": "Web App URL",
      "description": "Your Zeroed web app URL",
      "type": "textfield",
      "required": true,
      "default": "https://zeroed.vercel.app",
      "placeholder": "https://zeroed.vercel.app"
    },
    {
      "name": "defaultFocusDuration",
      "title": "Default Focus Duration",
      "description": "Default duration for focus sessions (minutes)",
      "type": "dropdown",
      "required": false,
      "default": "25",
      "data": [
        { "title": "15 minutes", "value": "15" },
        { "title": "25 minutes", "value": "25" },
        { "title": "45 minutes", "value": "45" },
        { "title": "60 minutes", "value": "60" }
      ]
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.64.0",
    "@supabase/supabase-js": "^2.39.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.8",
    "@types/node": "20.10.0",
    "@types/react": "18.2.38",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0",
    "typescript": "^5.3.2"
  },
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

---

## Phase 1: Utilities & Types

### 1.1 Types

Create `src/types.ts`:
```typescript
export interface Task {
  id: string;
  user_id: string;
  list_id: string | null;
  title: string;
  notes: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  due_time: string | null;
  estimated_minutes: number;
  actual_minutes: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  zeroed_lists?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export interface List {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  position: number;
  is_default: boolean;
  created_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  status: "active" | "completed" | "cancelled";
}

export interface ParsedTask {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  estimatedMinutes: number;
  listName: string | null;
  tags: string[];
}

export interface Preferences {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  webAppUrl: string;
  defaultFocusDuration: string;
}
```

### 1.2 Constants

Create `src/utils/constants.ts`:
```typescript
export const PRIORITY_ICONS = {
  urgent: { source: "🔥", tooltip: "Urgent" },
  high: { source: "⬆️", tooltip: "High Priority" },
  normal: { source: "➖", tooltip: "Normal Priority" },
  low: { source: "⬇️", tooltip: "Low Priority" },
};

export const PRIORITY_COLORS = {
  urgent: "#ef4444",
  high: "#f97316",
  normal: "#71717a",
  low: "#3b82f6",
};

export const STATUS_ICONS = {
  pending: "○",
  in_progress: "◐",
  completed: "●",
};

export const ESTIMATE_OPTIONS = [
  { title: "5 min", value: "5" },
  { title: "15 min", value: "15" },
  { title: "25 min", value: "25" },
  { title: "45 min", value: "45" },
  { title: "1 hour", value: "60" },
  { title: "2 hours", value: "120" },
];

export const PRIORITY_OPTIONS = [
  { title: "Low", value: "low" },
  { title: "Normal", value: "normal" },
  { title: "High", value: "high" },
  { title: "🔥 Urgent", value: "urgent" },
];
```

### 1.3 Supabase Client

Create `src/utils/supabase.ts`:
```typescript
import { getPreferenceValues } from "@raycast/api";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Preferences } from "../types";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const { supabaseUrl, supabaseAnonKey, accessToken } = getPreferenceValues<Preferences>();

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseInstance;
}

export function getWebAppUrl(): string {
  const { webAppUrl } = getPreferenceValues<Preferences>();
  return webAppUrl.replace(/\/$/, ""); // Remove trailing slash
}

export function getDefaultFocusDuration(): number {
  const { defaultFocusDuration } = getPreferenceValues<Preferences>();
  return parseInt(defaultFocusDuration) || 25;
}
```

### 1.4 API Functions

Create `src/utils/api.ts`:
```typescript
import { getSupabase } from "./supabase";
import { Task, List, FocusSession } from "../types";

// ============================================================================
// TASKS
// ============================================================================

export async function getTodayTasks(): Promise<Task[]> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(id, name, color)")
    .or(`due_date.eq.${today},due_date.is.null`)
    .neq("status", "completed")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAllTasks(searchText?: string): Promise<Task[]> {
  const supabase = getSupabase();

  let query = supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(id, name, color)")
    .neq("status", "completed")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .limit(50);

  if (searchText) {
    query = query.ilike("title", `%${searchText}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getTasksByList(listId: string): Promise<Task[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(id, name, color)")
    .eq("list_id", listId)
    .neq("status", "completed")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getOverdueTasks(): Promise<Task[]> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(id, name, color)")
    .lt("due_date", today)
    .neq("status", "completed")
    .order("due_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createTask(task: {
  title: string;
  list_id?: string | null;
  priority?: string;
  estimated_minutes?: number;
  due_date?: string | null;
  due_time?: string | null;
  notes?: string | null;
}): Promise<Task> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("zeroed_tasks")
    .insert({
      title: task.title,
      list_id: task.list_id || null,
      priority: task.priority || "normal",
      estimated_minutes: task.estimated_minutes || 25,
      due_date: task.due_date || new Date().toISOString().split("T")[0],
      due_time: task.due_time || null,
      notes: task.notes || null,
      status: "pending",
    })
    .select("*, zeroed_lists(id, name, color)")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<Task> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("zeroed_tasks")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, zeroed_lists(id, name, color)")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function completeTask(id: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("zeroed_tasks")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ============================================================================
// LISTS
// ============================================================================

export async function getLists(): Promise<List[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("zeroed_lists")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getListWithTaskCount(): Promise<(List & { task_count: number })[]> {
  const supabase = getSupabase();

  const { data: lists, error: listsError } = await supabase
    .from("zeroed_lists")
    .select("*")
    .order("position", { ascending: true });

  if (listsError) throw new Error(listsError.message);

  // Get task counts
  const { data: counts, error: countsError } = await supabase
    .from("zeroed_tasks")
    .select("list_id")
    .neq("status", "completed");

  if (countsError) throw new Error(countsError.message);

  const countMap: Record<string, number> = {};
  counts?.forEach((t) => {
    if (t.list_id) {
      countMap[t.list_id] = (countMap[t.list_id] || 0) + 1;
    }
  });

  return (lists || []).map((list) => ({
    ...list,
    task_count: countMap[list.id] || 0,
  }));
}

// ============================================================================
// FOCUS SESSIONS
// ============================================================================

export async function startFocusSession(
  taskId: string | null,
  durationMinutes: number
): Promise<FocusSession> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("zeroed_focus_sessions")
    .insert({
      task_id: taskId,
      duration_minutes: durationMinutes,
      started_at: new Date().toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Update task status if linked
  if (taskId) {
    await supabase
      .from("zeroed_tasks")
      .update({ status: "in_progress" })
      .eq("id", taskId);
  }

  return data;
}

// ============================================================================
// STATS
// ============================================================================

export async function getTodayStats(): Promise<{
  completed: number;
  remaining: number;
  focusMinutes: number;
}> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];

  const [completedRes, remainingRes, focusRes] = await Promise.all([
    supabase
      .from("zeroed_tasks")
      .select("id", { count: "exact" })
      .eq("status", "completed")
      .gte("completed_at", `${today}T00:00:00`),
    supabase
      .from("zeroed_tasks")
      .select("id", { count: "exact" })
      .or(`due_date.eq.${today},due_date.is.null`)
      .neq("status", "completed"),
    supabase
      .from("zeroed_focus_sessions")
      .select("duration_minutes")
      .eq("status", "completed")
      .gte("started_at", `${today}T00:00:00`),
  ]);

  const focusMinutes = focusRes.data?.reduce((sum, s) => sum + s.duration_minutes, 0) || 0;

  return {
    completed: completedRes.count || 0,
    remaining: remainingRes.count || 0,
    focusMinutes,
  };
}
```

### 1.5 Natural Language Parser

Create `src/utils/parse.ts`:
```typescript
import { addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday, format } from "date-fns";
import { ParsedTask } from "../types";

const DAY_PATTERNS: Record<string, () => Date> = {
  today: () => new Date(),
  tomorrow: () => addDays(new Date(), 1),
  monday: () => nextMonday(new Date()),
  tuesday: () => nextTuesday(new Date()),
  wednesday: () => nextWednesday(new Date()),
  thursday: () => nextThursday(new Date()),
  friday: () => nextFriday(new Date()),
  saturday: () => nextSaturday(new Date()),
  sunday: () => nextSunday(new Date()),
  mon: () => nextMonday(new Date()),
  tue: () => nextTuesday(new Date()),
  wed: () => nextWednesday(new Date()),
  thu: () => nextThursday(new Date()),
  fri: () => nextFriday(new Date()),
  sat: () => nextSaturday(new Date()),
  sun: () => nextSunday(new Date()),
};

const PRIORITY_PATTERNS: Record<string, "low" | "normal" | "high" | "urgent"> = {
  "!urgent": "urgent",
  "!high": "high",
  "!low": "low",
  "asap": "urgent",
  "urgent": "urgent",
  "important": "high",
};

const ESTIMATE_PATTERNS: Record<string, number> = {
  "quick": 5,
  "short": 15,
  "medium": 25,
  "long": 45,
  "big": 60,
};

export function parseNaturalLanguage(input: string): ParsedTask {
  let text = input.trim();
  let dueDate: string | null = null;
  let dueTime: string | null = null;
  let priority: "low" | "normal" | "high" | "urgent" = "normal";
  let estimatedMinutes = 25;
  let listName: string | null = null;
  const tags: string[] = [];

  // Extract time (e.g., "3pm", "15:00", "at 3pm")
  const timeMatch = text.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;

    dueTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    text = text.replace(timeMatch[0], "").trim();
  }

  // Extract date patterns
  for (const [pattern, getDate] of Object.entries(DAY_PATTERNS)) {
    const regex = new RegExp(`\\b${pattern}\\b`, "i");
    if (regex.test(text)) {
      dueDate = format(getDate(), "yyyy-MM-dd");
      text = text.replace(regex, "").trim();
      break;
    }
  }

  // Extract "in X days"
  const inDaysMatch = text.match(/in\s+(\d+)\s+days?/i);
  if (inDaysMatch) {
    dueDate = format(addDays(new Date(), parseInt(inDaysMatch[1])), "yyyy-MM-dd");
    text = text.replace(inDaysMatch[0], "").trim();
  }

  // Extract priority
  for (const [pattern, prio] of Object.entries(PRIORITY_PATTERNS)) {
    const regex = new RegExp(`\\b${pattern}\\b`, "i");
    if (regex.test(text)) {
      priority = prio;
      text = text.replace(regex, "").trim();
      break;
    }
  }

  // Extract estimate
  for (const [pattern, mins] of Object.entries(ESTIMATE_PATTERNS)) {
    const regex = new RegExp(`\\b${pattern}\\b`, "i");
    if (regex.test(text)) {
      estimatedMinutes = mins;
      text = text.replace(regex, "").trim();
      break;
    }
  }

  // Extract explicit time estimate (e.g., "30m", "1h", "1.5h")
  const explicitTimeMatch = text.match(/(\d+(?:\.\d+)?)\s*(m|min|mins|minutes?|h|hr|hrs|hours?)/i);
  if (explicitTimeMatch) {
    const value = parseFloat(explicitTimeMatch[1]);
    const unit = explicitTimeMatch[2].toLowerCase();
    estimatedMinutes = unit.startsWith("h") ? Math.round(value * 60) : Math.round(value);
    text = text.replace(explicitTimeMatch[0], "").trim();
  }

  // Extract list (e.g., "#Work", "in Work list")
  const listHashMatch = text.match(/#(\w+)/);
  if (listHashMatch) {
    listName = listHashMatch[1];
    text = text.replace(listHashMatch[0], "").trim();
  }

  const listInMatch = text.match(/(?:in|to)\s+(\w+)\s+list/i);
  if (listInMatch) {
    listName = listInMatch[1];
    text = text.replace(listInMatch[0], "").trim();
  }

  // Extract tags (e.g., "@phone", "@email")
  const tagMatches = text.match(/@(\w+)/g);
  if (tagMatches) {
    tagMatches.forEach((tag) => {
      tags.push(tag.substring(1));
      text = text.replace(tag, "").trim();
    });
  }

  // Clean up remaining text
  text = text.replace(/\s+/g, " ").trim();

  return {
    title: text,
    dueDate,
    dueTime,
    priority,
    estimatedMinutes,
    listName,
    tags,
  };
}
```

---

## Phase 2: Quick Capture Commands

### 2.1 Standard Add Task

Create `src/add-task.tsx`:
```typescript
import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  popToRoot,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { createTask, getLists } from "./utils/api";
import { List } from "./types";
import { ESTIMATE_OPTIONS, PRIORITY_OPTIONS } from "./utils/constants";

export default function AddTask() {
  const [isLoading, setIsLoading] = useState(false);
  const [lists, setLists] = useState<List[]>([]);
  const { pop } = useNavigation();

  useEffect(() => {
    getLists()
      .then(setLists)
      .catch((err) => {
        showToast({ style: Toast.Style.Failure, title: "Failed to load lists", message: err.message });
      });
  }, []);

  async function handleSubmit(values: {
    title: string;
    listId: string;
    priority: string;
    estimate: string;
    dueDate: Date | null;
    notes: string;
  }) {
    if (!values.title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    setIsLoading(true);

    try {
      await createTask({
        title: values.title.trim(),
        list_id: values.listId || null,
        priority: values.priority,
        estimated_minutes: parseInt(values.estimate),
        due_date: values.dueDate ? values.dueDate.toISOString().split("T")[0] : null,
        notes: values.notes || null,
      });

      showToast({ style: Toast.Style.Success, title: "Task added", message: values.title });
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Task" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Task"
        placeholder="What needs to be done?"
        autoFocus
      />

      <Form.Dropdown id="listId" title="List" defaultValue="">
        <Form.Dropdown.Item value="" title="No List" />
        {lists.map((list) => (
          <Form.Dropdown.Item
            key={list.id}
            value={list.id}
            title={list.name}
            icon={{ source: "dot.png", tintColor: list.color }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="priority" title="Priority" defaultValue="normal">
        {PRIORITY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="estimate" title="Estimate" defaultValue="25">
        {ESTIMATE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      <Form.DatePicker id="dueDate" title="Due Date" type={Form.DatePicker.Type.Date} />

      <Form.TextArea id="notes" title="Notes" placeholder="Additional details..." />
    </Form>
  );
}
```

### 2.2 Natural Language Add Task

Create `src/add-task-nl.tsx`:
```typescript
import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  popToRoot,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { createTask, getLists } from "./utils/api";
import { parseNaturalLanguage } from "./utils/parse";
import { List, ParsedTask } from "./types";
import { format } from "date-fns";

export default function AddTaskNL() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getLists().then(setLists).catch(console.error);
  }, []);

  useEffect(() => {
    if (input.trim()) {
      const result = parseNaturalLanguage(input);
      setParsed(result);
    } else {
      setParsed(null);
    }
  }, [input]);

  async function handleSubmit() {
    if (!parsed || !parsed.title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Enter a task" });
      return;
    }

    setIsLoading(true);

    try {
      // Find list by name if specified
      let listId: string | null = null;
      if (parsed.listName) {
        const list = lists.find(
          (l) => l.name.toLowerCase() === parsed.listName?.toLowerCase()
        );
        listId = list?.id || null;
      }

      await createTask({
        title: parsed.title,
        list_id: listId,
        priority: parsed.priority,
        estimated_minutes: parsed.estimatedMinutes,
        due_date: parsed.dueDate,
        due_time: parsed.dueTime,
      });

      showToast({ style: Toast.Style.Success, title: "Task added", message: parsed.title });
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const previewMarkdown = parsed
    ? `
## Preview

**Task:** ${parsed.title || "(empty)"}

| Field | Value |
|-------|-------|
| Due Date | ${parsed.dueDate ? format(new Date(parsed.dueDate), "EEE, MMM d") : "Today"} |
| Due Time | ${parsed.dueTime || "—"} |
| Priority | ${parsed.priority} |
| Estimate | ${parsed.estimatedMinutes} min |
| List | ${parsed.listName || "—"} |
${parsed.tags.length > 0 ? `| Tags | ${parsed.tags.join(", ")} |` : ""}

---

*Examples:*
- "Call mom tomorrow 3pm"
- "Review PR #Work urgent 30m"
- "Buy groceries friday !low"
`
    : `
## Quick Add with Natural Language

Type naturally and Zeroed will parse:

- **Dates:** "today", "tomorrow", "monday", "in 3 days"
- **Times:** "3pm", "15:00", "at noon"
- **Priority:** "urgent", "!high", "!low"
- **Duration:** "30m", "1h", "quick", "long"
- **List:** "#Work", "in Personal list"
- **Tags:** "@phone", "@email"

*Example: "Call mom tomorrow 3pm #Personal quick"*
`;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title=""
        placeholder="Call mom tomorrow 3pm #Personal"
        value={input}
        onChange={setInput}
        autoFocus
      />
      <Form.Description title="Preview" text={previewMarkdown} />
    </Form>
  );
}
```

---

## Phase 3: Task Views

### 3.1 Today's Tasks

Create `src/today.tsx`:
```typescript
import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getTodayTasks, completeTask, deleteTask, getOverdueTasks } from "./utils/api";
import { getWebAppUrl } from "./utils/supabase";
import { Task } from "./types";
import { PRIORITY_COLORS } from "./utils/constants";
import { format } from "date-fns";

export default function Today() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function loadTasks() {
    setIsLoading(true);
    try {
      const [todayTasks, overdueTasks] = await Promise.all([
        getTodayTasks(),
        getOverdueTasks(),
      ]);
      setTasks(todayTasks);
      setOverdue(overdueTasks);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleComplete(task: Task) {
    try {
      await completeTask(task.id);
      showToast({ style: Toast.Style.Success, title: "Task completed! ✓" });
      loadTasks();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to complete task" });
    }
  }

  async function handleDelete(task: Task) {
    const confirmed = await confirmAlert({
      title: "Delete Task?",
      message: `Are you sure you want to delete "${task.title}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) {
      try {
        await deleteTask(task.id);
        showToast({ style: Toast.Style.Success, title: "Task deleted" });
        loadTasks();
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to delete task" });
      }
    }
  }

  function TaskItem({ task }: { task: Task }) {
    const priorityColor = PRIORITY_COLORS[task.priority];
    const subtitle = [
      task.estimated_minutes && `${task.estimated_minutes}m`,
      task.zeroed_lists?.name,
    ]
      .filter(Boolean)
      .join(" • ");

    return (
      <List.Item
        title={task.title}
        subtitle={subtitle}
        icon={{ source: Icon.Circle, tintColor: priorityColor }}
        accessories={[
          task.due_time ? { text: task.due_time } : {},
          task.priority === "urgent" ? { icon: "🔥" } : {},
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Complete"
                icon={Icon.Checkmark}
                onAction={() => handleComplete(task)}
              />
              <Action.OpenInBrowser
                title="Open in Zeroed"
                url={`${getWebAppUrl()}/today?task=${task.id}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="Start Focus"
                icon={Icon.Clock}
                onAction={() => push(<StartFocusFromTask task={task} />)}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(task)}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={loadTasks}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tasks...">
      {overdue.length > 0 && (
        <List.Section title="⚠️ Overdue" subtitle={`${overdue.length} tasks`}>
          {overdue.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </List.Section>
      )}

      <List.Section title="Today" subtitle={`${tasks.length} tasks`}>
        {tasks.length === 0 && !isLoading ? (
          <List.EmptyView
            title="All clear!"
            description="No tasks for today"
            icon="🎉"
            actions={
              <ActionPanel>
                <Action.Push title="Add Task" target={<AddTask />} icon={Icon.Plus} />
              </ActionPanel>
            }
          />
        ) : (
          tasks.map((task) => <TaskItem key={task.id} task={task} />)
        )}
      </List.Section>
    </List>
  );
}

// Inline component for focus from task
import AddTask from "./add-task";
import StartFocusFromTask from "./start-focus";
```

### 3.2 All Tasks with Search

Create `src/all-tasks.tsx`:
```typescript
import {
  Action,
  ActionPanel,
  List,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getAllTasks, completeTask } from "./utils/api";
import { getWebAppUrl } from "./utils/supabase";
import { Task } from "./types";
import { PRIORITY_COLORS } from "./utils/constants";
import { format, isToday, isTomorrow, isPast } from "date-fns";

export default function AllTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadTasks = useCallback(async (search?: string) => {
    setIsLoading(true);
    try {
      const data = await getAllTasks(search);
      setTasks(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadTasks(searchText);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchText, loadTasks]);

  async function handleComplete(task: Task) {
    try {
      await completeTask(task.id);
      showToast({ style: Toast.Style.Success, title: "Task completed!" });
      loadTasks(searchText);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed" });
    }
  }

  function formatDueDate(date: string | null): string {
    if (!date) return "No date";
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isPast(d)) return `Overdue: ${format(d, "MMM d")}`;
    return format(d, "EEE, MMM d");
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search all tasks..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.title}
          subtitle={task.zeroed_lists?.name || ""}
          icon={{ source: Icon.Circle, tintColor: PRIORITY_COLORS[task.priority] }}
          accessories={[
            { text: formatDueDate(task.due_date) },
            { text: `${task.estimated_minutes}m` },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Complete"
                icon={Icon.Checkmark}
                onAction={() => handleComplete(task)}
              />
              <Action.OpenInBrowser
                title="Open in Zeroed"
                url={`${getWebAppUrl()}/today?task=${task.id}`}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => loadTasks(searchText)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

### 3.3 Lists View

Create `src/lists.tsx`:
```typescript
import {
  Action,
  ActionPanel,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getListWithTaskCount, getTasksByList, completeTask } from "./utils/api";
import { getWebAppUrl } from "./utils/supabase";
import { List as ListType, Task } from "./types";
import { PRIORITY_COLORS } from "./utils/constants";

function ListTasks({ list }: { list: ListType }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadTasks() {
    try {
      const data = await getTasksByList(list.id);
      setTasks(data);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to load tasks" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, [list.id]);

  async function handleComplete(task: Task) {
    await completeTask(task.id);
    showToast({ style: Toast.Style.Success, title: "Completed!" });
    loadTasks();
  }

  return (
    <List isLoading={isLoading} navigationTitle={list.name}>
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.title}
          subtitle={`${task.estimated_minutes}m`}
          icon={{ source: Icon.Circle, tintColor: PRIORITY_COLORS[task.priority] }}
          actions={
            <ActionPanel>
              <Action title="Complete" icon={Icon.Checkmark} onAction={() => handleComplete(task)} />
              <Action.OpenInBrowser title="Open" url={`${getWebAppUrl()}/today?task=${task.id}`} />
            </ActionPanel>
          }
        />
      ))}
      {tasks.length === 0 && !isLoading && (
        <List.EmptyView title="No tasks" description={`No pending tasks in ${list.name}`} />
      )}
    </List>
  );
}

export default function Lists() {
  const [lists, setLists] = useState<(ListType & { task_count: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    getListWithTaskCount()
      .then(setLists)
      .catch(() => showToast({ style: Toast.Style.Failure, title: "Failed to load lists" }))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <List isLoading={isLoading}>
      {lists.map((list) => (
        <List.Item
          key={list.id}
          title={list.name}
          subtitle={`${list.task_count} tasks`}
          icon={{ source: Icon.Folder, tintColor: list.color }}
          actions={
            <ActionPanel>
              <Action title="View Tasks" onAction={() => push(<ListTasks list={list} />)} />
              <Action.OpenInBrowser title="Open in Zeroed" url={`${getWebAppUrl()}/lists/${list.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

---

## Phase 4: Focus Session

### 4.1 Start Focus Command

Create `src/start-focus.tsx`:
```typescript
import {
  Action,
  ActionPanel,
  List,
  Icon,
  showToast,
  Toast,
  showHUD,
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getTodayTasks, startFocusSession } from "./utils/api";
import { getWebAppUrl, getDefaultFocusDuration } from "./utils/supabase";
import { Task } from "./types";
import { PRIORITY_COLORS } from "./utils/constants";

interface StartFocusProps {
  task?: Task;
}

export default function StartFocus({ task }: StartFocusProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(!task);
  const defaultDuration = getDefaultFocusDuration();

  useEffect(() => {
    if (!task) {
      getTodayTasks()
        .then(setTasks)
        .catch(() => showToast({ style: Toast.Style.Failure, title: "Failed to load tasks" }))
        .finally(() => setIsLoading(false));
    }
  }, [task]);

  async function handleStartFocus(selectedTask: Task | null, duration: number) {
    try {
      await startFocusSession(selectedTask?.id || null, duration);
      
      // Open web app focus mode
      const url = selectedTask
        ? `${getWebAppUrl()}/focus?task=${selectedTask.id}&duration=${duration}`
        : `${getWebAppUrl()}/focus?duration=${duration}`;
      
      await open(url);
      await showHUD(`🎯 Focus started: ${duration} minutes`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to start focus",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // If a specific task was passed, show duration options
  if (task) {
    const durations = [15, 25, 45, 60];
    
    return (
      <List>
        <List.Section title={`Focus on: ${task.title}`}>
          {durations.map((duration) => (
            <List.Item
              key={duration}
              title={`${duration} minutes`}
              icon={Icon.Clock}
              accessories={[duration === defaultDuration ? { tag: "Default" } : {}]}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Focus"
                    icon={Icon.Play}
                    onAction={() => handleStartFocus(task, duration)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  // Show task selection
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a task to focus on...">
      <List.Section title="Quick Focus (No Task)">
        <List.Item
          title="Start Untimed Focus"
          subtitle="Focus without a specific task"
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action
                title="Start 25 min"
                onAction={() => handleStartFocus(null, 25)}
              />
              <Action
                title="Start 45 min"
                onAction={() => handleStartFocus(null, 45)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Today's Tasks" subtitle="Select to focus">
        {tasks.map((t) => (
          <List.Item
            key={t.id}
            title={t.title}
            subtitle={`${t.estimated_minutes}m estimated`}
            icon={{ source: Icon.Circle, tintColor: PRIORITY_COLORS[t.priority] }}
            actions={
              <ActionPanel>
                <Action
                  title={`Focus (${t.estimated_minutes}m)`}
                  icon={Icon.Play}
                  onAction={() => handleStartFocus(t, t.estimated_minutes)}
                />
                <Action
                  title="Focus 25 min"
                  onAction={() => handleStartFocus(t, 25)}
                />
                <Action
                  title="Focus 45 min"
                  onAction={() => handleStartFocus(t, 45)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
```

---

## Phase 5: Menu Bar Command

### 5.1 Menu Bar

Create `src/menu-bar.tsx`:
```typescript
import {
  MenuBarExtra,
  Icon,
  open,
  showHUD,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getTodayStats, getTodayTasks, completeTask } from "./utils/api";
import { getWebAppUrl } from "./utils/supabase";
import { Task } from "./types";

export default function MenuBar() {
  const [stats, setStats] = useState({ completed: 0, remaining: 0, focusMinutes: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    try {
      const [statsData, tasksData] = await Promise.all([
        getTodayStats(),
        getTodayTasks(),
      ]);
      setStats(statsData);
      setTasks(tasksData.slice(0, 5)); // Top 5 tasks
    } catch (error) {
      console.error("Failed to load menu bar data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleComplete(task: Task) {
    try {
      await completeTask(task.id);
      await showHUD(`✓ ${task.title}`);
      loadData();
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  }

  const title = isLoading ? "..." : `${stats.remaining}`;
  const tooltip = `${stats.remaining} tasks remaining • ${stats.completed} done today`;

  return (
    <MenuBarExtra icon={Icon.CheckCircle} title={title} tooltip={tooltip} isLoading={isLoading}>
      <MenuBarExtra.Section title={`Today: ${stats.completed}/${stats.completed + stats.remaining} done`}>
        <MenuBarExtra.Item
          title={`${Math.floor(stats.focusMinutes / 60)}h ${stats.focusMinutes % 60}m focused`}
          icon={Icon.Clock}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Quick Actions">
        <MenuBarExtra.Item
          title="Add Task"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => launchCommand({ name: "add-task", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Quick Add (Natural Language)"
          icon={Icon.Text}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          onAction={() => launchCommand({ name: "add-task-nl", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Start Focus"
          icon={Icon.Clock}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => launchCommand({ name: "start-focus", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>

      {tasks.length > 0 && (
        <MenuBarExtra.Section title="Up Next">
          {tasks.map((task) => (
            <MenuBarExtra.Item
              key={task.id}
              title={task.title}
              subtitle={`${task.estimated_minutes}m`}
              icon={task.priority === "urgent" ? "🔥" : Icon.Circle}
              onAction={() => handleComplete(task)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Zeroed"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open(getWebAppUrl())}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={loadData}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
```

---

## Phase 6: Web App Auth Token Endpoint

Add this endpoint to your Next.js app for generating Raycast tokens:

### 6.1 Token Generation API

Create `app/api/raycast-token/route.ts`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return token info
  return NextResponse.json({
    accessToken: session.access_token,
    expiresAt: session.expires_at,
    user: {
      email: session.user.email,
    },
  });
}
```

### 6.2 Settings Page Token Display

Add to your settings page (`components/settings/integrations-settings.tsx`):
```typescript
"use client";

import { useState } from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function IntegrationsSettings() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function generateToken() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/raycast-token");
      const data = await res.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        setToken(data.accessToken);
        toast.success("Token generated!");
      }
    } catch (error) {
      toast.error("Failed to generate token");
    } finally {
      setIsLoading(false);
    }
  }

  function copyToken() {
    if (token) {
      navigator.clipboard.writeText(token);
      toast.success("Token copied to clipboard!");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raycast Extension</CardTitle>
        <CardDescription>
          Quick capture tasks from anywhere with the Zeroed Raycast extension
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a
              href="raycast://extensions/zeroed"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Install Extension
            </a>
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Access Token</Label>
          <p className="text-sm text-muted-foreground">
            Generate a token to connect Raycast to your Zeroed account
          </p>
          
          {token ? (
            <div className="flex gap-2">
              <Input value={token} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyToken}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={generateToken}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={generateToken} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Token"}
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>In Raycast extension preferences, enter:</p>
          <ul className="list-disc list-inside">
            <li>Supabase URL: <code>{process.env.NEXT_PUBLIC_SUPABASE_URL}</code></li>
            <li>Supabase Anon Key: <code>[from Supabase dashboard]</code></li>
            <li>Access Token: <code>[generated above]</code></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 7: Development & Publishing

### 7.1 Development

```bash
cd zeroed-raycast

# Start development
npm run dev

# This opens Raycast with your extension in development mode
# Changes hot-reload automatically
```

### 7.2 Testing Checklist

- [ ] Add Task form submits correctly
- [ ] Natural language parsing works
- [ ] Today view loads tasks
- [ ] Complete task updates status
- [ ] Delete task with confirmation
- [ ] All Tasks search filters
- [ ] Lists view shows task counts
- [ ] Focus session launches web app
- [ ] Menu bar shows stats
- [ ] Menu bar quick actions work
- [ ] Deep links open correct pages
- [ ] Error handling shows toasts
- [ ] Loading states display

### 7.3 Publishing

```bash
# Lint and build
npm run lint
npm run build

# Publish to Raycast Store
npm run publish
```

### 7.4 Recommended Hotkeys

Set these in Raycast preferences for maximum productivity:

| Hotkey | Command |
|--------|---------|
| `⌘⇧T` | Add Task |
| `⌘⇧Q` | Quick Add (Natural Language) |
| `⌘⇧Z` | Today's Tasks |
| `⌘⇧F` | Start Focus |

---

## Files Summary

**Extension Files:**
- `src/add-task.tsx` — Standard task form
- `src/add-task-nl.tsx` — Natural language capture
- `src/today.tsx` — Today's tasks list
- `src/all-tasks.tsx` — Searchable all tasks
- `src/lists.tsx` — Lists with task counts
- `src/start-focus.tsx` — Focus session launcher
- `src/menu-bar.tsx` — Menu bar command
- `src/utils/supabase.ts` — Supabase client
- `src/utils/api.ts` — API functions
- `src/utils/parse.ts` — Natural language parser
- `src/utils/constants.ts` — Shared constants
- `src/types.ts` — TypeScript types

**Web App Additions:**
- `app/api/raycast-token/route.ts` — Token generation
- `components/settings/integrations-settings.tsx` — Token UI

---

## Dependencies

```json
{
  "@raycast/api": "^1.64.0",
  "@supabase/supabase-js": "^2.39.0",
  "date-fns": "^3.0.0"
}
```

---

**Sprint 7 complete. Quick capture from anywhere! ⚡**
