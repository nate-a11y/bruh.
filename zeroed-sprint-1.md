# Zeroed Sprint 1 — Core Task Upgrades

## Overview

This sprint adds three major features to Zeroed:
1. **Subtasks** — Nested tasks with progress tracking
2. **Tags** — Flexible labeling and filtering system
3. **Recurring Tasks** — Repeating tasks with smart scheduling

Work through each phase sequentially. Create the SQL migration file first, then implement features one by one.

---

## Phase 0: Database Migrations

**FIRST:** Create the SQL migration file at `supabase/migrations/001_sprint1_features.sql` with all the schema changes. Then run it in Supabase SQL Editor.

```sql
-- ============================================================================
-- ZEROED SPRINT 1 MIGRATIONS
-- Features: Subtasks, Tags, Recurring Tasks
-- ============================================================================

-- ============================================================================
-- SUBTASKS
-- ============================================================================

-- Add parent reference for subtasks
alter table zeroed_tasks add column if not exists parent_id uuid references zeroed_tasks(id) on delete cascade;
alter table zeroed_tasks add column if not exists is_subtask boolean default false;

-- Index for efficient subtask queries
create index if not exists zeroed_tasks_parent_idx on zeroed_tasks(parent_id) where parent_id is not null;

-- Function to count subtasks and completed subtasks
create or replace function zeroed_get_subtask_progress(task_uuid uuid)
returns table(total integer, completed integer) as $$
begin
  return query
  select 
    count(*)::integer as total,
    count(*) filter (where status = 'completed')::integer as completed
  from zeroed_tasks
  where parent_id = task_uuid;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- TAGS
-- ============================================================================

-- Tags table
create table if not exists zeroed_tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, lower(name))
);

-- Task-tag junction table
create table if not exists zeroed_task_tags (
  task_id uuid references zeroed_tasks(id) on delete cascade,
  tag_id uuid references zeroed_tags(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (task_id, tag_id)
);

-- Indexes
create index if not exists zeroed_tags_user_idx on zeroed_tags(user_id);
create index if not exists zeroed_task_tags_task_idx on zeroed_task_tags(task_id);
create index if not exists zeroed_task_tags_tag_idx on zeroed_task_tags(tag_id);

-- RLS for tags
alter table zeroed_tags enable row level security;
alter table zeroed_task_tags enable row level security;

create policy "Users can CRUD own tags" on zeroed_tags
  for all using (auth.uid() = user_id);

create policy "Users can CRUD own task_tags" on zeroed_task_tags
  for all using (
    exists (
      select 1 from zeroed_tasks 
      where zeroed_tasks.id = zeroed_task_tags.task_id 
      and zeroed_tasks.user_id = auth.uid()
    )
  );

-- Updated_at trigger for tags
create trigger zeroed_tags_updated_at before update on zeroed_tags
  for each row execute function zeroed_handle_updated_at();

-- ============================================================================
-- RECURRING TASKS
-- ============================================================================

-- Add recurrence fields to tasks
alter table zeroed_tasks add column if not exists is_recurring boolean default false;
alter table zeroed_tasks add column if not exists recurrence_rule jsonb;
-- recurrence_rule format:
-- {
--   "frequency": "daily" | "weekly" | "monthly" | "yearly",
--   "interval": 1,           -- every X days/weeks/months/years
--   "daysOfWeek": [1,3,5],   -- for weekly: 0=Sun, 1=Mon, etc.
--   "dayOfMonth": 15,        -- for monthly: specific date
--   "endDate": "2025-12-31", -- optional end date
--   "endAfter": 10           -- optional: end after X occurrences
-- }

alter table zeroed_tasks add column if not exists recurrence_parent_id uuid references zeroed_tasks(id) on delete set null;
alter table zeroed_tasks add column if not exists recurrence_index integer default 0;

-- Index for finding recurrence instances
create index if not exists zeroed_tasks_recurrence_parent_idx on zeroed_tasks(recurrence_parent_id) where recurrence_parent_id is not null;

-- Function to generate next occurrence date
create or replace function zeroed_next_occurrence(
  p_rule jsonb,
  p_current_date date
)
returns date as $$
declare
  v_frequency text;
  v_interval integer;
  v_next_date date;
  v_end_date date;
begin
  v_frequency := p_rule->>'frequency';
  v_interval := coalesce((p_rule->>'interval')::integer, 1);
  v_end_date := (p_rule->>'endDate')::date;
  
  case v_frequency
    when 'daily' then
      v_next_date := p_current_date + (v_interval || ' days')::interval;
    when 'weekly' then
      v_next_date := p_current_date + (v_interval * 7 || ' days')::interval;
    when 'monthly' then
      v_next_date := p_current_date + (v_interval || ' months')::interval;
    when 'yearly' then
      v_next_date := p_current_date + (v_interval || ' years')::interval;
    else
      v_next_date := null;
  end case;
  
  -- Check if past end date
  if v_end_date is not null and v_next_date > v_end_date then
    return null;
  end if;
  
  return v_next_date;
end;
$$ language plpgsql immutable;

-- ============================================================================
-- SAVED FILTERS (Smart Lists)
-- ============================================================================

create table if not exists zeroed_saved_filters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text default 'filter',
  color text default '#6366f1',
  filter_config jsonb not null,
  -- filter_config format:
  -- {
  --   "lists": ["uuid1", "uuid2"],     -- filter by lists (empty = all)
  --   "tags": ["uuid1", "uuid2"],      -- filter by tags (AND logic)
  --   "status": ["pending", "in_progress"],
  --   "priority": ["high", "urgent"],
  --   "dueDateRange": "today" | "week" | "overdue" | "no_date",
  --   "isRecurring": true | false | null,
  --   "hasSubtasks": true | false | null
  -- }
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table zeroed_saved_filters enable row level security;

create policy "Users can CRUD own saved_filters" on zeroed_saved_filters
  for all using (auth.uid() = user_id);

-- Trigger
create trigger zeroed_saved_filters_updated_at before update on zeroed_saved_filters
  for each row execute function zeroed_handle_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Increment daily stats (if not exists)
-- ============================================================================

create or replace function zeroed_increment_daily_stat(
  p_user_id uuid,
  p_date date,
  p_field text,
  p_value integer default 1
)
returns void as $$
begin
  insert into zeroed_daily_stats (user_id, date, tasks_completed, tasks_created, focus_minutes, sessions_completed, estimated_minutes, actual_minutes)
  values (p_user_id, p_date, 0, 0, 0, 0, 0, 0)
  on conflict (user_id, date) do nothing;
  
  execute format('update zeroed_daily_stats set %I = %I + $1, updated_at = now() where user_id = $2 and date = $3', p_field, p_field)
  using p_value, p_user_id, p_date;
end;
$$ language plpgsql security definer;
```

**After creating the file, copy the SQL and run it in your Supabase SQL Editor.**

---

## Phase 1: TypeScript Types

Update `lib/supabase/types.ts` to include the new tables and fields.

### Add to Database type:

```typescript
// Add these to the Tables section in lib/supabase/types.ts

zeroed_tags: {
  Row: {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    name: string;
    color?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    name?: string;
    color?: string;
    created_at?: string;
    updated_at?: string;
  };
};

zeroed_task_tags: {
  Row: {
    task_id: string;
    tag_id: string;
    created_at: string;
  };
  Insert: {
    task_id: string;
    tag_id: string;
    created_at?: string;
  };
  Update: {
    task_id?: string;
    tag_id?: string;
    created_at?: string;
  };
};

zeroed_saved_filters: {
  Row: {
    id: string;
    user_id: string;
    name: string;
    icon: string;
    color: string;
    filter_config: FilterConfig;
    position: number;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    name: string;
    icon?: string;
    color?: string;
    filter_config: FilterConfig;
    position?: number;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    name?: string;
    icon?: string;
    color?: string;
    filter_config?: FilterConfig;
    position?: number;
    created_at?: string;
    updated_at?: string;
  };
};
```

### Update zeroed_tasks Row type to include new fields:

```typescript
// Add these fields to zeroed_tasks Row type
parent_id: string | null;
is_subtask: boolean;
is_recurring: boolean;
recurrence_rule: RecurrenceRule | null;
recurrence_parent_id: string | null;
recurrence_index: number;
```

### Add new type definitions at the bottom:

```typescript
// Recurrence rule type
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number;   // 1-31
  endDate?: string;      // ISO date string
  endAfter?: number;     // End after X occurrences
}

// Filter config type
export interface FilterConfig {
  lists?: string[];
  tags?: string[];
  status?: ('pending' | 'in_progress' | 'completed' | 'cancelled')[];
  priority?: ('low' | 'normal' | 'high' | 'urgent')[];
  dueDateRange?: 'today' | 'week' | 'month' | 'overdue' | 'no_date' | 'has_date';
  isRecurring?: boolean;
  hasSubtasks?: boolean;
}

// Export new table types
export type Tag = Tables<"zeroed_tags">;
export type TaskTag = Tables<"zeroed_task_tags">;
export type SavedFilter = Tables<"zeroed_saved_filters">;

// Extended task type with relations
export interface TaskWithRelations extends Task {
  zeroed_lists?: { name: string; color: string } | null;
  zeroed_tags?: Tag[];
  subtasks?: Task[];
  subtask_progress?: { total: number; completed: number };
}
```

---

## Phase 2: Subtasks Implementation

### 2.1 Update Server Actions

Add to `app/(dashboard)/actions.ts`:

```typescript
// ============================================================================
// SUBTASK ACTIONS
// ============================================================================

export async function createSubtask(parentId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get parent task to inherit list_id
  const { data: parent } = await supabase
    .from("zeroed_tasks")
    .select("list_id, user_id")
    .eq("id", parentId)
    .single();

  if (!parent || parent.user_id !== user.id) {
    return { error: "Parent task not found" };
  }

  const title = formData.get("title") as string;
  const estimatedMinutes = parseInt((formData.get("estimatedMinutes") as string) || "15");

  // Get max position among siblings
  const { data: maxPos } = await supabase
    .from("zeroed_tasks")
    .select("position")
    .eq("parent_id", parentId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from("zeroed_tasks")
    .insert({
      user_id: user.id,
      list_id: parent.list_id,
      parent_id: parentId,
      is_subtask: true,
      title,
      estimated_minutes: estimatedMinutes,
      position: (maxPos?.position || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true, subtask: data };
}

export async function promoteSubtaskToTask(subtaskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      parent_id: null,
      is_subtask: false,
    })
    .eq("id", subtaskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function convertToSubtask(taskId: string, newParentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Prevent circular reference
  if (taskId === newParentId) {
    return { error: "Cannot make a task a subtask of itself" };
  }

  // Get parent's list_id
  const { data: parent } = await supabase
    .from("zeroed_tasks")
    .select("list_id")
    .eq("id", newParentId)
    .eq("user_id", user.id)
    .single();

  if (!parent) {
    return { error: "Parent task not found" };
  }

  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      parent_id: newParentId,
      is_subtask: true,
      list_id: parent.list_id,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function getSubtaskProgress(taskId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .rpc("zeroed_get_subtask_progress", { task_uuid: taskId });

  if (error) {
    return { total: 0, completed: 0 };
  }

  return data[0] || { total: 0, completed: 0 };
}
```

### 2.2 Create Subtask Components

Create `components/tasks/subtask-list.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Plus, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createSubtask, completeTask, deleteTask } from "@/app/(dashboard)/actions";
import { toast } from "sonner";
import type { Task } from "@/lib/supabase/types";

interface SubtaskListProps {
  parentId: string;
  subtasks: Task[];
  onUpdate?: () => void;
}

export function SubtaskList({ parentId, subtasks, onUpdate }: SubtaskListProps) {
  const [showInput, setShowInput] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsAdding(true);
    const formData = new FormData();
    formData.set("title", newTitle);
    formData.set("estimatedMinutes", "15");

    const result = await createSubtask(parentId, formData);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      setNewTitle("");
      toast.success("Subtask added");
      onUpdate?.();
    }
    setIsAdding(false);
  }

  async function handleToggleComplete(subtask: Task) {
    const result = await completeTask(subtask.id);
    if (result.error) {
      toast.error(result.error);
    }
    onUpdate?.();
  }

  async function handleDelete(subtaskId: string) {
    const result = await deleteTask(subtaskId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Subtask deleted");
      onUpdate?.();
    }
  }

  const completed = subtasks.filter(s => s.status === "completed").length;
  const total = subtasks.length;

  return (
    <div className="mt-3 ml-6 space-y-2">
      {/* Progress indicator */}
      {total > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
          <span>{completed}/{total}</span>
        </div>
      )}

      {/* Subtask items */}
      <AnimatePresence mode="popLayout">
        {subtasks.map((subtask) => (
          <motion.div
            key={subtask.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 group"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
            <Checkbox
              checked={subtask.status === "completed"}
              onCheckedChange={() => handleToggleComplete(subtask)}
              className="h-4 w-4"
            />
            <span className={cn(
              "flex-1 text-sm",
              subtask.status === "completed" && "line-through text-muted-foreground"
            )}>
              {subtask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => handleDelete(subtask.id)}
            >
              <span className="sr-only">Delete</span>
              ×
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add subtask input */}
      {showInput ? (
        <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Subtask title"
            className="h-8 text-sm"
            autoFocus
            disabled={isAdding}
            onBlur={() => {
              if (!newTitle.trim()) setShowInput(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowInput(false);
                setNewTitle("");
              }
            }}
          />
          <Button type="submit" size="sm" disabled={isAdding || !newTitle.trim()}>
            Add
          </Button>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 text-xs"
          onClick={() => setShowInput(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add subtask
        </Button>
      )}
    </div>
  );
}
```

### 2.3 Update TaskItem Component

Modify `components/tasks/task-item.tsx` to include subtasks:

1. Add subtasks prop to TaskItemProps
2. Import and render SubtaskList when task has subtasks
3. Add expand/collapse toggle for subtasks
4. Show subtask progress indicator next to title

```typescript
// Add to TaskItemProps interface
subtasks?: Task[];
onSubtaskUpdate?: () => void;

// Add state for expansion
const [isExpanded, setIsExpanded] = useState(false);

// Add to the JSX, after the meta section but before the closing motion.div:
{(subtasks && subtasks.length > 0) || !isCompleted ? (
  <div className={cn(!isExpanded && "hidden")}>
    <SubtaskList
      parentId={task.id}
      subtasks={subtasks || []}
      onUpdate={onSubtaskUpdate}
    />
  </div>
) : null}

// Add expand button to the task item header area
{(subtasks && subtasks.length > 0) && (
  <Button
    variant="ghost"
    size="icon"
    className="h-6 w-6"
    onClick={() => setIsExpanded(!isExpanded)}
  >
    <ChevronDown className={cn(
      "h-4 w-4 transition-transform",
      isExpanded && "rotate-180"
    )} />
  </Button>
)}
```

### 2.4 Update Task Queries

Modify queries in page components to fetch subtasks:

```typescript
// When fetching tasks, also get their subtasks
const { data: tasks } = await supabase
  .from("zeroed_tasks")
  .select(`
    *,
    zeroed_lists(name, color),
    subtasks:zeroed_tasks!parent_id(
      id, title, status, position, estimated_minutes
    )
  `)
  .eq("user_id", user.id)
  .eq("is_subtask", false)  // Only get parent tasks
  .neq("status", "cancelled")
  .order("position", { ascending: true });
```

---

## Phase 3: Tags Implementation

### 3.1 Tag Server Actions

Add to `app/(dashboard)/actions.ts`:

```typescript
// ============================================================================
// TAG ACTIONS
// ============================================================================

export async function createTag(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const name = (formData.get("name") as string).trim();
  const color = (formData.get("color") as string) || "#6366f1";

  if (!name) {
    return { error: "Tag name is required" };
  }

  const { data, error } = await supabase
    .from("zeroed_tags")
    .insert({
      user_id: user.id,
      name,
      color,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Tag already exists" };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true, tag: data };
}

export async function updateTag(tagId: string, updates: { name?: string; color?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_tags")
    .update(updates)
    .eq("id", tagId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteTag(tagId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_tags")
    .delete()
    .eq("id", tagId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function addTagToTask(taskId: string, tagId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify task belongs to user
  const { data: task } = await supabase
    .from("zeroed_tasks")
    .select("id")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (!task) {
    return { error: "Task not found" };
  }

  const { error } = await supabase
    .from("zeroed_task_tags")
    .insert({ task_id: taskId, tag_id: tagId });

  if (error) {
    if (error.code === "23505") {
      return { error: "Tag already added" };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function removeTagFromTask(taskId: string, tagId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_task_tags")
    .delete()
    .eq("task_id", taskId)
    .eq("tag_id", tagId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function getUserTags() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("zeroed_tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  return data || [];
}
```

### 3.2 Tag Components

Create `components/tags/tag-badge.tsx`:

```typescript
"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/supabase/types";

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  size?: "sm" | "default";
  className?: string;
}

export function TagBadge({ tag, onRemove, size = "default", className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className
      )}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        borderColor: `${tag.color}40`,
        borderWidth: 1,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/10 rounded-full p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
```

Create `components/tags/tag-input.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagBadge } from "./tag-badge";
import { createTag, addTagToTask, removeTagFromTask } from "@/app/(dashboard)/actions";
import { toast } from "sonner";
import { LIST_COLORS } from "@/lib/constants";
import type { Tag } from "@/lib/supabase/types";

interface TagInputProps {
  taskId: string;
  selectedTags: Tag[];
  availableTags: Tag[];
  onUpdate?: () => void;
}

export function TagInput({ taskId, selectedTags, availableTags, onUpdate }: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTags = availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(search.toLowerCase()) &&
      !selectedTags.some((t) => t.id === tag.id)
  );

  const showCreateOption = search.trim() && 
    !availableTags.some((t) => t.name.toLowerCase() === search.toLowerCase());

  async function handleSelectTag(tag: Tag) {
    const result = await addTagToTask(taskId, tag.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      onUpdate?.();
    }
    setSearch("");
  }

  async function handleRemoveTag(tagId: string) {
    const result = await removeTagFromTask(taskId, tagId);
    if (result.error) {
      toast.error(result.error);
    } else {
      onUpdate?.();
    }
  }

  async function handleCreateTag() {
    if (!search.trim()) return;
    
    setIsCreating(true);
    const formData = new FormData();
    formData.set("name", search.trim());
    formData.set("color", LIST_COLORS[Math.floor(Math.random() * LIST_COLORS.length)]);

    const result = await createTag(formData);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.tag) {
      await addTagToTask(taskId, result.tag.id);
      toast.success(`Tag "${search}" created`);
      onUpdate?.();
    }
    
    setSearch("");
    setIsCreating(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {selectedTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size="sm"
          onRemove={() => handleRemoveTag(tag.id)}
        />
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or create tag..."
            className="h-8 mb-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreateOption) {
                e.preventDefault();
                handleCreateTag();
              }
            }}
          />
          
          <div className="max-h-48 overflow-auto space-y-1">
            {filteredTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleSelectTag(tag)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-left"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm">{tag.name}</span>
              </button>
            ))}

            {showCreateOption && (
              <button
                onClick={handleCreateTag}
                disabled={isCreating}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-left text-primary"
              >
                <Plus className="h-3 w-3" />
                <span className="text-sm">Create "{search}"</span>
              </button>
            )}

            {!filteredTags.length && !showCreateOption && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No tags found
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

Create `components/tags/tag-manager.tsx` for Settings:

```typescript
"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagBadge } from "./tag-badge";
import { createTag, updateTag, deleteTag } from "@/app/(dashboard)/actions";
import { toast } from "sonner";
import { LIST_COLORS } from "@/lib/constants";
import type { Tag } from "@/lib/supabase/types";

interface TagManagerProps {
  tags: Tag[];
}

export function TagManager({ tags: initialTags }: TagManagerProps) {
  const [tags, setTags] = useState(initialTags);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(LIST_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;

    const formData = new FormData();
    formData.set("name", newTagName.trim());
    formData.set("color", newTagColor);

    const result = await createTag(formData);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.tag) {
      setTags([...tags, result.tag]);
      setNewTagName("");
      toast.success("Tag created");
    }
  }

  async function handleUpdate(tagId: string) {
    if (!editName.trim()) return;

    const result = await updateTag(tagId, { name: editName.trim() });
    
    if (result.error) {
      toast.error(result.error);
    } else {
      setTags(tags.map(t => t.id === tagId ? { ...t, name: editName } : t));
      setEditingId(null);
      toast.success("Tag updated");
    }
  }

  async function handleDelete(tagId: string) {
    const result = await deleteTag(tagId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      setTags(tags.filter(t => t.id !== tagId));
      toast.success("Tag deleted");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new tag */}
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag name"
            className="flex-1"
          />
          <div className="flex gap-1">
            {LIST_COLORS.slice(0, 6).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewTagColor(color)}
                className={cn(
                  "h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                  newTagColor === color ? "ring-foreground" : "ring-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <Button type="submit" size="sm" disabled={!newTagName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {/* Tag list */}
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-2 rounded-lg border"
            >
              {editingId === tag.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 w-48"
                  autoFocus
                  onBlur={() => handleUpdate(tag.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(tag.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <TagBadge tag={tag} />
              )}
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingId(tag.id);
                    setEditName(tag.name);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(tag.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tags yet. Create your first tag above.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3.3 Add Popover to shadcn

```bash
npx shadcn@latest add popover checkbox
```

### 3.4 Update Task Queries for Tags

When fetching tasks, include tags:

```typescript
const { data: tasks } = await supabase
  .from("zeroed_tasks")
  .select(`
    *,
    zeroed_lists(name, color),
    zeroed_task_tags(
      zeroed_tags(id, name, color)
    ),
    subtasks:zeroed_tasks!parent_id(
      id, title, status, position
    )
  `)
  .eq("user_id", user.id)
  .eq("is_subtask", false)
  .order("position", { ascending: true });

// Transform the nested tags structure
const tasksWithTags = tasks?.map(task => ({
  ...task,
  tags: task.zeroed_task_tags?.map(tt => tt.zeroed_tags) || []
}));
```

---

## Phase 4: Recurring Tasks Implementation

### 4.1 Recurrence Server Actions

Add to `app/(dashboard)/actions.ts`:

```typescript
// ============================================================================
// RECURRING TASK ACTIONS
// ============================================================================

export async function createRecurringTask(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const title = formData.get("title") as string;
  const listId = formData.get("listId") as string;
  const estimatedMinutes = parseInt((formData.get("estimatedMinutes") as string) || "25");
  const priority = (formData.get("priority") as string) || "normal";
  const dueDate = formData.get("dueDate") as string;
  
  // Recurrence config
  const frequency = formData.get("frequency") as string;
  const interval = parseInt((formData.get("interval") as string) || "1");
  const daysOfWeek = formData.getAll("daysOfWeek").map(d => parseInt(d as string));
  const endDate = formData.get("endDate") as string | null;

  const recurrenceRule: RecurrenceRule = {
    frequency: frequency as RecurrenceRule['frequency'],
    interval,
    ...(daysOfWeek.length > 0 && { daysOfWeek }),
    ...(endDate && { endDate }),
  };

  const { data, error } = await supabase
    .from("zeroed_tasks")
    .insert({
      user_id: user.id,
      list_id: listId,
      title,
      estimated_minutes: estimatedMinutes,
      priority,
      due_date: dueDate,
      is_recurring: true,
      recurrence_rule: recurrenceRule,
      recurrence_index: 0,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true, task: data };
}

export async function completeRecurringTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get the task
  const { data: task, error: fetchError } = await supabase
    .from("zeroed_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !task) {
    return { error: "Task not found" };
  }

  if (!task.is_recurring || !task.recurrence_rule) {
    // Not recurring, just complete normally
    return completeTask(taskId);
  }

  const rule = task.recurrence_rule as RecurrenceRule;
  const currentDueDate = task.due_date ? new Date(task.due_date) : new Date();
  
  // Calculate next occurrence
  const nextDate = calculateNextOccurrence(rule, currentDueDate);

  // Mark current as completed
  const { error: updateError } = await supabase
    .from("zeroed_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Create next occurrence if not past end date
  if (nextDate) {
    const { error: createError } = await supabase
      .from("zeroed_tasks")
      .insert({
        user_id: user.id,
        list_id: task.list_id,
        title: task.title,
        notes: task.notes,
        estimated_minutes: task.estimated_minutes,
        priority: task.priority,
        due_date: nextDate.toISOString().split("T")[0],
        due_time: task.due_time,
        is_recurring: true,
        recurrence_rule: rule,
        recurrence_parent_id: task.recurrence_parent_id || task.id,
        recurrence_index: task.recurrence_index + 1,
      });

    if (createError) {
      console.error("Failed to create next occurrence:", createError);
    }
  }

  // Update daily stats
  const today = format(new Date(), "yyyy-MM-dd");
  await supabase.rpc("zeroed_increment_daily_stat", {
    p_user_id: user.id,
    p_date: today,
    p_field: "tasks_completed",
  });

  revalidatePath("/");
  return { success: true };
}

export async function skipRecurringOccurrence(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get the task
  const { data: task } = await supabase
    .from("zeroed_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (!task) {
    return { error: "Task not found" };
  }

  const rule = task.recurrence_rule as RecurrenceRule;
  const currentDueDate = task.due_date ? new Date(task.due_date) : new Date();
  const nextDate = calculateNextOccurrence(rule, currentDueDate);

  if (nextDate) {
    // Update to next occurrence date instead of completing
    const { error } = await supabase
      .from("zeroed_tasks")
      .update({
        due_date: nextDate.toISOString().split("T")[0],
        recurrence_index: task.recurrence_index + 1,
      })
      .eq("id", taskId);

    if (error) {
      return { error: error.message };
    }
  } else {
    // No more occurrences, mark as cancelled
    const { error } = await supabase
      .from("zeroed_tasks")
      .update({ status: "cancelled" })
      .eq("id", taskId);

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/");
  return { success: true };
}

export async function stopRecurring(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      is_recurring: false,
      recurrence_rule: null,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

// Helper function
function calculateNextOccurrence(rule: RecurrenceRule, fromDate: Date): Date | null {
  const next = new Date(fromDate);
  
  switch (rule.frequency) {
    case "daily":
      next.setDate(next.getDate() + rule.interval);
      break;
    case "weekly":
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Find next matching day
        let found = false;
        for (let i = 1; i <= 7 * rule.interval; i++) {
          const check = new Date(fromDate);
          check.setDate(check.getDate() + i);
          if (rule.daysOfWeek.includes(check.getDay())) {
            next.setTime(check.getTime());
            found = true;
            break;
          }
        }
        if (!found) {
          next.setDate(next.getDate() + 7 * rule.interval);
        }
      } else {
        next.setDate(next.getDate() + 7 * rule.interval);
      }
      break;
    case "monthly":
      next.setMonth(next.getMonth() + rule.interval);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + rule.interval);
      break;
  }

  // Check end date
  if (rule.endDate && next > new Date(rule.endDate)) {
    return null;
  }

  return next;
}
```

### 4.2 Recurrence UI Components

Create `components/tasks/recurrence-selector.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { RecurrenceRule } from "@/lib/supabase/types";

interface RecurrenceSelectorProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceRule["frequency"]>(value?.frequency || "daily");
  const [interval, setInterval] = useState(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(value?.daysOfWeek || [1, 2, 3, 4, 5]);
  const [endDate, setEndDate] = useState(value?.endDate || "");

  function handleSave() {
    const rule: RecurrenceRule = {
      frequency,
      interval,
      ...(frequency === "weekly" && daysOfWeek.length > 0 && { daysOfWeek }),
      ...(endDate && { endDate }),
    };
    onChange(rule);
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setOpen(false);
  }

  function toggleDay(day: number) {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  }

  function getDisplayText(): string {
    if (!value) return "Set recurrence";
    
    const { frequency, interval, daysOfWeek } = value;
    
    if (frequency === "daily") {
      return interval === 1 ? "Daily" : `Every ${interval} days`;
    }
    if (frequency === "weekly") {
      if (daysOfWeek?.length === 5 && !daysOfWeek.includes(0) && !daysOfWeek.includes(6)) {
        return "Weekdays";
      }
      if (interval === 1 && !daysOfWeek?.length) {
        return "Weekly";
      }
      return `Every ${interval > 1 ? interval + " " : ""}week${interval > 1 ? "s" : ""}`;
    }
    if (frequency === "monthly") {
      return interval === 1 ? "Monthly" : `Every ${interval} months`;
    }
    if (frequency === "yearly") {
      return interval === 1 ? "Yearly" : `Every ${interval} years`;
    }
    return "Custom";
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={value ? "secondary" : "outline"}
          size="sm"
          className={cn("h-8", value && "text-primary")}
        >
          <Repeat className="h-4 w-4 mr-1" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Repeat</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurrenceRule["frequency"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Every</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="99"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                {frequency === "daily" && (interval === 1 ? "day" : "days")}
                {frequency === "weekly" && (interval === 1 ? "week" : "weeks")}
                {frequency === "monthly" && (interval === 1 ? "month" : "months")}
                {frequency === "yearly" && (interval === 1 ? "year" : "years")}
              </span>
            </div>
          </div>

          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label>On days</Label>
              <div className="flex gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "h-8 w-8 rounded-full text-xs font-medium transition-colors",
                      daysOfWeek.includes(day.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {day.label[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Ends</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Never"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to repeat forever
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### 4.3 Add Select Component

```bash
npx shadcn@latest add select
```

### 4.4 Update Task Form

Add RecurrenceSelector to `components/tasks/task-form.tsx`:

1. Import the RecurrenceSelector component
2. Add state for recurrence rule
3. Add the selector to the form grid
4. Include recurrence data in form submission

### 4.5 Update Task Item

Show recurrence indicator on recurring tasks:

```typescript
// In task-item.tsx, add to the meta section:
{task.is_recurring && (
  <div className="flex items-center gap-1 text-primary">
    <Repeat className="h-3 w-3" />
    <span>Recurring</span>
  </div>
)}
```

Add dropdown options for recurring tasks:
- "Complete this occurrence"
- "Skip this occurrence"  
- "Stop recurring"
- "Edit recurrence"

---

## Phase 5: Integration & Polish

### 5.1 Update Sidebar with Tags

Add a "Tags" section to the sidebar that shows all user tags as filter options.

### 5.2 Add Filter Bar

Create a filter bar component that appears above task lists:

```typescript
// components/tasks/filter-bar.tsx
// Filter by: Status, Priority, Tags, Due date range
// Show active filters as removable badges
// "Clear all" button
```

### 5.3 Keyboard Shortcuts

Add new shortcuts:
- `t` — Add tag to selected task
- `r` — Set recurrence on selected task
- `Tab` — Add subtask to selected task

### 5.4 Update Today Page

Show subtask progress inline with tasks, show tag badges, show recurring indicator.

### 5.5 Settings: Tag Management

Add TagManager component to settings page under a new "Tags" section.

---

## Testing Checklist

### Subtasks
- [ ] Create subtask on existing task
- [ ] Complete subtask → progress updates
- [ ] Complete all subtasks → prompt to complete parent
- [ ] Delete subtask
- [ ] Promote subtask to task
- [ ] Convert task to subtask
- [ ] Subtasks inherit parent's list

### Tags
- [ ] Create new tag
- [ ] Add tag to task
- [ ] Remove tag from task
- [ ] Create tag inline while adding to task
- [ ] Edit tag name
- [ ] Edit tag color
- [ ] Delete tag → removed from all tasks
- [ ] Filter tasks by tag

### Recurring Tasks
- [ ] Create daily recurring task
- [ ] Create weekly recurring task with specific days
- [ ] Create monthly recurring task
- [ ] Complete recurring task → next occurrence created
- [ ] Skip occurrence
- [ ] Stop recurring
- [ ] Edit recurrence rule
- [ ] Recurrence respects end date

### Integration
- [ ] Task item shows subtask progress
- [ ] Task item shows tags
- [ ] Task item shows recurring indicator
- [ ] Filter bar works with all filters combined
- [ ] Mobile responsive

---

## Final Steps

1. Run `npm run lint` and fix any issues
2. Run `npm run build` to verify no TypeScript errors
3. Test all features manually
4. Deploy to Vercel

---

## Files Changed Summary

**New Files:**
- `supabase/migrations/001_sprint1_features.sql`
- `components/tasks/subtask-list.tsx`
- `components/tags/tag-badge.tsx`
- `components/tags/tag-input.tsx`
- `components/tags/tag-manager.tsx`
- `components/tasks/recurrence-selector.tsx`
- `components/tasks/filter-bar.tsx`

**Modified Files:**
- `lib/supabase/types.ts` — New types
- `lib/constants.ts` — New constants
- `app/(dashboard)/actions.ts` — New server actions
- `components/tasks/task-item.tsx` — Subtasks, tags, recurrence display
- `components/tasks/task-form.tsx` — Recurrence selector, tags
- `components/tasks/task-list.tsx` — Pass subtasks and tags
- `components/dashboard/sidebar.tsx` — Tags section
- `app/(dashboard)/today/page.tsx` — Updated queries
- `app/(dashboard)/lists/[listId]/page.tsx` — Updated queries
- `app/(dashboard)/settings/page.tsx` — Tag manager section

---

**Ready to implement. Work through each phase sequentially. Good luck!** 🚀
```
