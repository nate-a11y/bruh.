# Zeroed Sprint 8 — Smart Filters, Snooze, Rituals & Polish

## Overview

The "make it sticky" sprint that elevates Zeroed from task app to productivity system:

1. **Smart Filters + Saved Views** — Custom queries, save and reuse
2. **Snooze / Defer** — "Not today" with intelligent rescheduling
3. **Start Date + Due Date** — When to start vs when it's due
4. **Archive / Logbook** — Searchable completion history
5. **Undo Stack** — Mistake recovery with toast actions
6. **Focus Sounds** — Ambient audio for deep work
7. **Daily Planning Ritual** — Guided morning flow
8. **Shutdown Routine** — End-of-day closure and prep

---

## Phase 0: Database Migrations

```sql
-- ============================================================================
-- ZEROED SPRINT 8 MIGRATIONS
-- ============================================================================

-- Add start_date to tasks
alter table zeroed_tasks add column if not exists 
  start_date date;

-- Add snoozed_until for deferred tasks
alter table zeroed_tasks add column if not exists 
  snoozed_until date;

-- Smart filters / saved views
create table if not exists zeroed_smart_filters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text default 'filter',
  color text default '#6366f1',
  filter_config jsonb not null,
  position integer default 0,
  is_pinned boolean default false,
  use_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table zeroed_smart_filters enable row level security;
create policy "Users can CRUD own filters" on zeroed_smart_filters
  for all using (auth.uid() = user_id);

create index zeroed_smart_filters_user_idx 
  on zeroed_smart_filters(user_id, position);

-- Archive / Logbook (materialized view for performance)
create table if not exists zeroed_archive (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid not null, -- Original task ID (task may be deleted)
  title text not null,
  notes text,
  list_name text,
  list_color text,
  priority text,
  tags text[],
  estimated_minutes integer,
  actual_minutes integer,
  completed_at timestamptz not null,
  created_at timestamptz, -- Original task creation
  focus_sessions_count integer default 0,
  focus_total_minutes integer default 0
);

alter table zeroed_archive enable row level security;
create policy "Users can read own archive" on zeroed_archive
  for select using (auth.uid() = user_id);

create index zeroed_archive_user_completed_idx 
  on zeroed_archive(user_id, completed_at desc);
create index zeroed_archive_search_idx 
  on zeroed_archive using gin(to_tsvector('english', title || ' ' || coalesce(notes, '')));

-- Function to archive completed task
create or replace function zeroed_archive_task()
returns trigger as $$
begin
  if NEW.status = 'completed' and (OLD.status is null or OLD.status != 'completed') then
    insert into zeroed_archive (
      user_id, task_id, title, notes, list_name, list_color, priority,
      estimated_minutes, actual_minutes, completed_at, created_at
    )
    select 
      NEW.user_id,
      NEW.id,
      NEW.title,
      NEW.notes,
      l.name,
      l.color,
      NEW.priority,
      NEW.estimated_minutes,
      NEW.actual_minutes,
      NEW.completed_at,
      NEW.created_at
    from zeroed_tasks t
    left join zeroed_lists l on l.id = NEW.list_id
    where t.id = NEW.id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists archive_completed_task on zeroed_tasks;
create trigger archive_completed_task
  after update on zeroed_tasks
  for each row execute function zeroed_archive_task();

-- Undo history
create table if not exists zeroed_undo_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  action_type text not null, -- 'complete', 'delete', 'snooze', 'move', 'update'
  entity_type text not null, -- 'task', 'list', etc.
  entity_id uuid not null,
  previous_state jsonb not null,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '5 minutes')
);

alter table zeroed_undo_history enable row level security;
create policy "Users can CRUD own undo history" on zeroed_undo_history
  for all using (auth.uid() = user_id);

-- Auto-cleanup expired undo entries
create index zeroed_undo_expires_idx on zeroed_undo_history(expires_at);

-- Daily planning state
alter table zeroed_user_preferences add column if not exists 
  last_daily_planning_at date;
alter table zeroed_user_preferences add column if not exists 
  last_shutdown_at date;
alter table zeroed_user_preferences add column if not exists 
  daily_intention text;
alter table zeroed_user_preferences add column if not exists 
  planning_preferences jsonb default '{"autoShowMorning": true, "autoShowEvening": true, "morningTime": "09:00", "eveningTime": "17:00"}'::jsonb;

-- Focus session sounds preference
alter table zeroed_user_preferences add column if not exists 
  focus_sound text default 'none'; -- 'none', 'rain', 'cafe', 'lofi', 'whitenoise', 'nature'
alter table zeroed_user_preferences add column if not exists 
  focus_sound_volume integer default 50;
```

---

## Phase 1: Smart Filters + Saved Views

### 1.1 Filter Types

Add to `lib/supabase/types.ts`:

```typescript
export interface FilterCondition {
  field: 'priority' | 'status' | 'list_id' | 'due_date' | 'start_date' | 'tags' | 'estimated_minutes' | 'has_subtasks' | 'is_recurring';
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'is_null' | 'is_not_null' | 'contains';
  value: any;
}

export interface FilterConfig {
  conditions: FilterCondition[];
  logic: 'and' | 'or';
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface SmartFilter {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  filter_config: FilterConfig;
  position: number;
  is_pinned: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

// Preset filters
export const PRESET_FILTERS: Record<string, FilterConfig> = {
  'high-priority': {
    conditions: [
      { field: 'priority', operator: 'in', value: ['high', 'urgent'] },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
    sort: { field: 'priority', direction: 'desc' },
  },
  'due-this-week': {
    conditions: [
      { field: 'due_date', operator: 'gte', value: 'today' },
      { field: 'due_date', operator: 'lte', value: 'end_of_week' },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
    sort: { field: 'due_date', direction: 'asc' },
  },
  'overdue': {
    conditions: [
      { field: 'due_date', operator: 'lt', value: 'today' },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
    sort: { field: 'due_date', direction: 'asc' },
  },
  'no-due-date': {
    conditions: [
      { field: 'due_date', operator: 'is_null', value: null },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
  },
  'quick-wins': {
    conditions: [
      { field: 'estimated_minutes', operator: 'lte', value: 15 },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
    sort: { field: 'estimated_minutes', direction: 'asc' },
  },
  'big-tasks': {
    conditions: [
      { field: 'estimated_minutes', operator: 'gte', value: 60 },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
  },
  'waiting': {
    conditions: [
      { field: 'status', operator: 'eq', value: 'waiting' },
    ],
    logic: 'and',
  },
  'actionable-today': {
    conditions: [
      { field: 'start_date', operator: 'lte', value: 'today' },
      { field: 'snoozed_until', operator: 'is_null', value: null },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
    sort: { field: 'priority', direction: 'desc' },
  },
};
```

### 1.2 Filter Engine

Create `lib/filters/engine.ts`:

```typescript
import { createClient } from "@/lib/supabase/client";
import { FilterConfig, FilterCondition } from "@/lib/supabase/types";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, addDays } from "date-fns";

function resolveDateValue(value: string): string {
  const today = new Date();
  
  switch (value) {
    case 'today':
      return format(today, 'yyyy-MM-dd');
    case 'tomorrow':
      return format(addDays(today, 1), 'yyyy-MM-dd');
    case 'yesterday':
      return format(addDays(today, -1), 'yyyy-MM-dd');
    case 'start_of_week':
      return format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'end_of_week':
      return format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'start_of_month':
      return format(startOfMonth(today), 'yyyy-MM-dd');
    case 'end_of_month':
      return format(endOfMonth(today), 'yyyy-MM-dd');
    default:
      return value;
  }
}

export function buildFilterQuery(
  baseQuery: any,
  config: FilterConfig
) {
  let query = baseQuery;

  for (const condition of config.conditions) {
    const value = ['due_date', 'start_date', 'snoozed_until'].includes(condition.field) && typeof condition.value === 'string'
      ? resolveDateValue(condition.value)
      : condition.value;

    switch (condition.operator) {
      case 'eq':
        query = query.eq(condition.field, value);
        break;
      case 'neq':
        query = query.neq(condition.field, value);
        break;
      case 'gt':
        query = query.gt(condition.field, value);
        break;
      case 'gte':
        query = query.gte(condition.field, value);
        break;
      case 'lt':
        query = query.lt(condition.field, value);
        break;
      case 'lte':
        query = query.lte(condition.field, value);
        break;
      case 'in':
        query = query.in(condition.field, value);
        break;
      case 'not_in':
        query = query.not(condition.field, 'in', `(${value.join(',')})`);
        break;
      case 'is_null':
        query = query.is(condition.field, null);
        break;
      case 'is_not_null':
        query = query.not(condition.field, 'is', null);
        break;
      case 'contains':
        query = query.contains(condition.field, value);
        break;
    }
  }

  if (config.sort) {
    query = query.order(config.sort.field, { ascending: config.sort.direction === 'asc' });
  }

  return query;
}

export async function executeFilter(userId: string, config: FilterConfig) {
  const supabase = createClient();
  
  let query = supabase
    .from('zeroed_tasks')
    .select('*, zeroed_lists(id, name, color), subtasks:zeroed_tasks!parent_id(id)')
    .eq('user_id', userId)
    .is('parent_id', null); // Exclude subtasks from main results

  query = buildFilterQuery(query, config);

  const { data, error } = await query.limit(100);

  if (error) throw error;
  return data || [];
}
```

### 1.3 Filter Builder UI

Create `components/filters/filter-builder.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { FilterConfig, FilterCondition } from "@/lib/supabase/types";

const FIELD_OPTIONS = [
  { value: 'priority', label: 'Priority', type: 'select', options: ['low', 'normal', 'high', 'urgent'] },
  { value: 'status', label: 'Status', type: 'select', options: ['pending', 'in_progress', 'completed', 'waiting'] },
  { value: 'list_id', label: 'List', type: 'list' },
  { value: 'due_date', label: 'Due Date', type: 'date' },
  { value: 'start_date', label: 'Start Date', type: 'date' },
  { value: 'estimated_minutes', label: 'Estimate (min)', type: 'number' },
  { value: 'has_subtasks', label: 'Has Subtasks', type: 'boolean' },
  { value: 'is_recurring', label: 'Is Recurring', type: 'boolean' },
];

const OPERATOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  select: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'in', label: 'is any of' },
  ],
  date: [
    { value: 'eq', label: 'is' },
    { value: 'lt', label: 'before' },
    { value: 'lte', label: 'on or before' },
    { value: 'gt', label: 'after' },
    { value: 'gte', label: 'on or after' },
    { value: 'is_null', label: 'is not set' },
    { value: 'is_not_null', label: 'is set' },
  ],
  number: [
    { value: 'eq', label: 'equals' },
    { value: 'lt', label: 'less than' },
    { value: 'lte', label: 'at most' },
    { value: 'gt', label: 'more than' },
    { value: 'gte', label: 'at least' },
  ],
  boolean: [
    { value: 'eq', label: 'is' },
  ],
  list: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'in', label: 'is any of' },
    { value: 'is_null', label: 'is not set' },
  ],
};

const DATE_VALUE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'end_of_week', label: 'End of this week' },
  { value: 'end_of_month', label: 'End of this month' },
];

interface FilterBuilderProps {
  config: FilterConfig;
  onChange: (config: FilterConfig) => void;
  lists: { id: string; name: string }[];
}

export function FilterBuilder({ config, onChange, lists }: FilterBuilderProps) {
  function addCondition() {
    onChange({
      ...config,
      conditions: [
        ...config.conditions,
        { field: 'priority', operator: 'eq', value: 'normal' },
      ],
    });
  }

  function updateCondition(index: number, updates: Partial<FilterCondition>) {
    const newConditions = [...config.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange({ ...config, conditions: newConditions });
  }

  function removeCondition(index: number) {
    onChange({
      ...config,
      conditions: config.conditions.filter((_, i) => i !== index),
    });
  }

  function getFieldType(field: string) {
    return FIELD_OPTIONS.find(f => f.value === field)?.type || 'select';
  }

  return (
    <div className="space-y-4">
      {/* Logic toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Match</span>
        <Select
          value={config.logic}
          onValueChange={(v) => onChange({ ...config, logic: v as 'and' | 'or' })}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">All</SelectItem>
            <SelectItem value="or">Any</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">of these conditions</span>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {config.conditions.map((condition, index) => {
          const fieldType = getFieldType(condition.field);
          const operators = OPERATOR_OPTIONS[fieldType] || OPERATOR_OPTIONS.select;
          const fieldConfig = FIELD_OPTIONS.find(f => f.value === condition.field);

          return (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

              {/* Field */}
              <Select
                value={condition.field}
                onValueChange={(v) => updateCondition(index, { field: v as any, value: '' })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator */}
              <Select
                value={condition.operator}
                onValueChange={(v) => updateCondition(index, { operator: v as any })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value */}
              {!['is_null', 'is_not_null'].includes(condition.operator) && (
                <>
                  {fieldType === 'select' && fieldConfig?.options && (
                    <Select
                      value={condition.value}
                      onValueChange={(v) => updateCondition(index, { value: v })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldConfig.options.map(o => (
                          <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {fieldType === 'date' && (
                    <Select
                      value={condition.value}
                      onValueChange={(v) => updateCondition(index, { value: v })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_VALUE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {fieldType === 'number' && (
                    <Input
                      type="number"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: parseInt(e.target.value) })}
                      className="w-24"
                    />
                  )}

                  {fieldType === 'list' && (
                    <Select
                      value={condition.value}
                      onValueChange={(v) => updateCondition(index, { value: v })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select list" />
                      </SelectTrigger>
                      <SelectContent>
                        {lists.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {fieldType === 'boolean' && (
                    <Select
                      value={condition.value?.toString()}
                      onValueChange={(v) => updateCondition(index, { value: v === 'true' })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCondition(index)}
                className="ml-auto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={addCondition}>
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>

      {/* Sort */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <span className="text-sm text-muted-foreground">Sort by</span>
        <Select
          value={config.sort?.field || 'created_at'}
          onValueChange={(v) => onChange({
            ...config,
            sort: { field: v, direction: config.sort?.direction || 'desc' }
          })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Created</SelectItem>
            <SelectItem value="due_date">Due Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="estimated_minutes">Estimate</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={config.sort?.direction || 'desc'}
          onValueChange={(v) => onChange({
            ...config,
            sort: { field: config.sort?.field || 'created_at', direction: v as 'asc' | 'desc' }
          })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

### 1.4 Save Filter Dialog

Create `components/filters/save-filter-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createSmartFilter } from "@/app/(dashboard)/actions";
import { toast } from "sonner";
import type { FilterConfig } from "@/lib/supabase/types";

const ICON_OPTIONS = [
  'filter', 'star', 'flame', 'zap', 'clock', 'calendar', 
  'flag', 'target', 'inbox', 'archive', 'tag', 'folder'
];

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6'
];

interface SaveFilterDialogProps {
  config: FilterConfig;
  onSaved?: () => void;
}

export function SaveFilterDialog({ config, onSaved }: SaveFilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("filter");
  const [color, setColor] = useState("#6366f1");
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    const result = await createSmartFilter({
      name,
      icon,
      color,
      filter_config: config,
      is_pinned: isPinned,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Filter "${name}" saved!`);
      setOpen(false);
      setName("");
      onSaved?.();
    }
    setIsSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save Filter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Smart Filter</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g., High Priority This Week"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(i => (
                    <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-1">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Pin to sidebar</Label>
              <p className="text-xs text-muted-foreground">Show in quick access</p>
            </div>
            <Switch checked={isPinned} onCheckedChange={setIsPinned} />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "Saving..." : "Save Filter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 1.5 Server Actions

```typescript
// ============================================================================
// SMART FILTER ACTIONS
// ============================================================================

export async function createSmartFilter(data: {
  name: string;
  icon: string;
  color: string;
  filter_config: FilterConfig;
  is_pinned: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get next position
  const { data: existing } = await supabase
    .from("zeroed_smart_filters")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1);

  const position = (existing?.[0]?.position ?? -1) + 1;

  const { data: filter, error } = await supabase
    .from("zeroed_smart_filters")
    .insert({
      user_id: user.id,
      name: data.name,
      icon: data.icon,
      color: data.color,
      filter_config: data.filter_config,
      is_pinned: data.is_pinned,
      position,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true, filter };
}

export async function getSmartFilters() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_smart_filters")
    .select("*")
    .eq("user_id", user.id)
    .order("position");

  return data || [];
}

export async function deleteSmartFilter(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("zeroed_smart_filters")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function executeSmartFilter(filterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get filter config
  const { data: filter } = await supabase
    .from("zeroed_smart_filters")
    .select("filter_config")
    .eq("id", filterId)
    .single();

  if (!filter) return { error: "Filter not found" };

  // Increment use count
  await supabase.rpc("increment_filter_use_count", { filter_id: filterId });

  // Execute filter
  const tasks = await executeFilter(user.id, filter.filter_config);
  return { success: true, tasks };
}
```

---

## Phase 2: Snooze / Defer

### 2.1 Snooze Actions

```typescript
// ============================================================================
// SNOOZE ACTIONS
// ============================================================================

export async function snoozeTask(
  taskId: string,
  until: Date | 'tomorrow' | 'next_week' | 'next_month'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get current task state for undo
  const { data: task } = await supabase
    .from("zeroed_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (!task) return { error: "Task not found" };

  // Calculate snooze date
  let snoozeDate: Date;
  if (until === 'tomorrow') {
    snoozeDate = addDays(new Date(), 1);
  } else if (until === 'next_week') {
    snoozeDate = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7);
  } else if (until === 'next_month') {
    snoozeDate = startOfMonth(addMonths(new Date(), 1));
  } else {
    snoozeDate = until;
  }

  // Save undo state
  await supabase.from("zeroed_undo_history").insert({
    user_id: user.id,
    action_type: "snooze",
    entity_type: "task",
    entity_id: taskId,
    previous_state: task,
  });

  // Update task
  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      snoozed_until: format(snoozeDate, "yyyy-MM-dd"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true, snoozedUntil: snoozeDate };
}

export async function unsnoozeTask(taskId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      snoozed_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function getSnoozedTasks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(name, color)")
    .eq("user_id", user.id)
    .not("snoozed_until", "is", null)
    .neq("status", "completed")
    .order("snoozed_until");

  return data || [];
}
```

### 2.2 Snooze Picker Component

Create `components/tasks/snooze-picker.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Clock, Sun, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { format, addDays, nextMonday, startOfMonth, addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { snoozeTask } from "@/app/(dashboard)/actions";
import { toast } from "sonner";

interface SnoozePickerProps {
  taskId: string;
  taskTitle: string;
  onSnoozed?: () => void;
}

export function SnoozePicker({ taskId, taskTitle, onSnoozed }: SnoozePickerProps) {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const quickOptions = [
    {
      label: "Tomorrow",
      value: "tomorrow" as const,
      icon: Sun,
      date: addDays(new Date(), 1),
    },
    {
      label: "Next Week",
      value: "next_week" as const,
      icon: CalendarDays,
      date: nextMonday(new Date()),
    },
    {
      label: "Next Month",
      value: "next_month" as const,
      icon: CalendarRange,
      date: startOfMonth(addMonths(new Date(), 1)),
    },
  ];

  async function handleSnooze(until: Date | 'tomorrow' | 'next_week' | 'next_month') {
    const result = await snoozeTask(taskId, until);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      const dateStr = result.snoozedUntil 
        ? format(new Date(result.snoozedUntil), "MMM d")
        : "";
      toast.success(`Snoozed until ${dateStr}`, {
        description: taskTitle,
        action: {
          label: "Undo",
          onClick: () => unsnoozeTask(taskId),
        },
      });
      setOpen(false);
      onSnoozed?.();
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Clock className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        {!showCalendar ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              Snooze until...
            </p>
            {quickOptions.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleSnooze(option.value)}
              >
                <option.icon className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {format(option.date, "MMM d")}
                </span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setShowCalendar(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Pick a date...
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCalendar(false)}
            >
              ← Back
            </Button>
            <CalendarUI
              mode="single"
              selected={undefined}
              onSelect={(date) => date && handleSnooze(date)}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

---

## Phase 3: Start Date + Due Date

### 3.1 Update Task Form

Add to task form/edit components:

```typescript
// In task-form.tsx or task-edit-dialog.tsx

<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label>Start Date</Label>
    <p className="text-xs text-muted-foreground">When to begin working</p>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Calendar className="h-4 w-4 mr-2" />
          {startDate ? format(startDate, "MMM d, yyyy") : "No start date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <CalendarUI
          mode="single"
          selected={startDate}
          onSelect={setStartDate}
        />
      </PopoverContent>
    </Popover>
  </div>

  <div className="space-y-2">
    <Label>Due Date</Label>
    <p className="text-xs text-muted-foreground">Deadline</p>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Calendar className="h-4 w-4 mr-2" />
          {dueDate ? format(dueDate, "MMM d, yyyy") : "No due date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <CalendarUI
          mode="single"
          selected={dueDate}
          onSelect={setDueDate}
          disabled={(date) => startDate && date < startDate}
        />
      </PopoverContent>
    </Popover>
  </div>
</div>
```

### 3.2 Actionable Filter

Tasks are "actionable" when:
- `start_date` is null OR `start_date <= today`
- AND `snoozed_until` is null OR `snoozed_until <= today`
- AND `status != 'completed'`

Update Today view to use this filter by default.

---

## Phase 4: Archive / Logbook

### 4.1 Archive Page

Create `app/(dashboard)/archive/page.tsx`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { ArchiveList } from "@/components/archive/archive-list";
import { ArchiveStats } from "@/components/archive/archive-stats";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: { q?: string; from?: string; to?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Build query
  let query = supabase
    .from("zeroed_archive")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(100);

  if (searchParams.q) {
    query = query.textSearch("title", searchParams.q);
  }

  if (searchParams.from) {
    query = query.gte("completed_at", searchParams.from);
  }

  if (searchParams.to) {
    query = query.lte("completed_at", searchParams.to);
  }

  const { data: entries } = await query;

  // Stats
  const { data: stats } = await supabase
    .from("zeroed_archive")
    .select("completed_at, actual_minutes")
    .eq("user_id", user.id)
    .gte("completed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return (
    <div className="flex flex-col h-full">
      <Header title="Logbook" subtitle="Your completion history" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <ArchiveStats data={stats || []} />
        <ArchiveList entries={entries || []} />
      </div>
    </div>
  );
}
```

### 4.2 Archive List Component

Create `components/archive/archive-list.tsx`:

```typescript
"use client";

import { useState } from "react";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { Search, Calendar, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";

interface ArchiveEntry {
  id: string;
  title: string;
  notes: string | null;
  list_name: string | null;
  list_color: string | null;
  priority: string;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  completed_at: string;
}

function groupByDate(entries: ArchiveEntry[]) {
  const groups: Record<string, ArchiveEntry[]> = {};
  
  entries.forEach(entry => {
    const date = new Date(entry.completed_at);
    let key: string;
    
    if (isToday(date)) key = "Today";
    else if (isYesterday(date)) key = "Yesterday";
    else if (isThisWeek(date)) key = "This Week";
    else if (isThisMonth(date)) key = "This Month";
    else key = format(date, "MMMM yyyy");
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });
  
  return groups;
}

export function ArchiveList({ entries }: { entries: ArchiveEntry[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");

  function handleSearch(value: string) {
    setSearch(value);
    const params = new URLSearchParams(searchParams);
    if (value) params.set("q", value);
    else params.delete("q");
    router.push(`/archive?${params.toString()}`);
  }

  const grouped = groupByDate(entries);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search completed tasks..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Entries */}
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {group}
            <Badge variant="secondary">{items.length}</Badge>
          </h3>
          <div className="space-y-1">
            {items.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {entry.list_name && (
                      <span style={{ color: entry.list_color || undefined }}>
                        {entry.list_name}
                      </span>
                    )}
                    {entry.actual_minutes && (
                      <span>{entry.actual_minutes}m</span>
                    )}
                    <span>{format(new Date(entry.completed_at), "h:mm a")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {entries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No completed tasks found</p>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 5: Undo Stack

### 5.1 Undo Actions

```typescript
// ============================================================================
// UNDO ACTIONS
// ============================================================================

export async function recordUndoableAction(
  actionType: string,
  entityType: string,
  entityId: string,
  previousState: any
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("zeroed_undo_history").insert({
    user_id: user.id,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId,
    previous_state: previousState,
  });
}

export async function undoLastAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get most recent undoable action
  const { data: undoEntry } = await supabase
    .from("zeroed_undo_history")
    .select("*")
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!undoEntry) return { error: "Nothing to undo" };

  // Restore previous state
  if (undoEntry.entity_type === "task") {
    const { error } = await supabase
      .from("zeroed_tasks")
      .upsert(undoEntry.previous_state);

    if (error) return { error: error.message };
  }

  // Delete undo entry
  await supabase
    .from("zeroed_undo_history")
    .delete()
    .eq("id", undoEntry.id);

  revalidatePath("/");
  return { success: true, actionType: undoEntry.action_type };
}

// Cleanup expired entries (call periodically)
export async function cleanupUndoHistory() {
  const supabase = await createClient();
  await supabase
    .from("zeroed_undo_history")
    .delete()
    .lt("expires_at", new Date().toISOString());
}
```

### 5.2 Undo Toast Hook

Create `lib/hooks/use-undo.ts`:

```typescript
"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { undoLastAction } from "@/app/(dashboard)/actions";

export function useUndo() {
  const showUndoToast = useCallback((
    message: string,
    description?: string
  ) => {
    toast.success(message, {
      description,
      action: {
        label: "Undo",
        onClick: async () => {
          const result = await undoLastAction();
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success("Action undone");
          }
        },
      },
      duration: 5000, // 5 seconds to undo
    });
  }, []);

  return { showUndoToast };
}
```

### 5.3 Keyboard Shortcut for Undo

Add to keyboard shortcuts:

```typescript
// In use-keyboard-shortcuts.ts
{
  key: "z",
  modifiers: ["cmd"],
  action: async () => {
    const result = await undoLastAction();
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Undone!");
    }
  },
  description: "Undo last action",
},
```

---

## Phase 6: Focus Sounds

### 6.1 Sound Player

Create `lib/audio/focus-sounds.ts`:

```typescript
export type SoundType = 'none' | 'rain' | 'cafe' | 'lofi' | 'whitenoise' | 'nature' | 'fireplace' | 'ocean';

export const SOUND_OPTIONS: { value: SoundType; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '🔇' },
  { value: 'rain', label: 'Rain', icon: '🌧️' },
  { value: 'cafe', label: 'Café', icon: '☕' },
  { value: 'lofi', label: 'Lo-Fi', icon: '🎵' },
  { value: 'whitenoise', label: 'White Noise', icon: '📻' },
  { value: 'nature', label: 'Nature', icon: '🌲' },
  { value: 'fireplace', label: 'Fireplace', icon: '🔥' },
  { value: 'ocean', label: 'Ocean', icon: '🌊' },
];

// URLs to royalty-free ambient sounds (host these on your CDN)
export const SOUND_URLS: Record<SoundType, string> = {
  none: '',
  rain: '/sounds/rain.mp3',
  cafe: '/sounds/cafe.mp3',
  lofi: '/sounds/lofi.mp3',
  whitenoise: '/sounds/whitenoise.mp3',
  nature: '/sounds/nature.mp3',
  fireplace: '/sounds/fireplace.mp3',
  ocean: '/sounds/ocean.mp3',
};

class FocusSoundPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentSound: SoundType = 'none';

  play(sound: SoundType, volume: number = 0.5) {
    this.stop();
    
    if (sound === 'none') return;

    const url = SOUND_URLS[sound];
    if (!url) return;

    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.volume = volume;
    this.audio.play().catch(console.error);
    this.currentSound = sound;
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.currentSound = 'none';
  }

  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getCurrentSound() {
    return this.currentSound;
  }

  isPlaying() {
    return this.audio !== null && !this.audio.paused;
  }
}

export const focusSoundPlayer = new FocusSoundPlayer();
```

### 6.2 Sound Picker Component

Create `components/focus/sound-picker.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { focusSoundPlayer, SOUND_OPTIONS, SoundType } from "@/lib/audio/focus-sounds";
import { cn } from "@/lib/utils";

interface SoundPickerProps {
  defaultSound?: SoundType;
  defaultVolume?: number;
  onSoundChange?: (sound: SoundType) => void;
}

export function SoundPicker({ defaultSound = 'none', defaultVolume = 50, onSoundChange }: SoundPickerProps) {
  const [sound, setSound] = useState<SoundType>(defaultSound);
  const [volume, setVolume] = useState(defaultVolume);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      focusSoundPlayer.stop();
    };
  }, []);

  function handleSoundChange(newSound: SoundType) {
    setSound(newSound);
    if (newSound === 'none') {
      focusSoundPlayer.stop();
      setIsPlaying(false);
    } else {
      focusSoundPlayer.play(newSound, volume / 100);
      setIsPlaying(true);
    }
    onSoundChange?.(newSound);
  }

  function handleVolumeChange(newVolume: number[]) {
    const vol = newVolume[0];
    setVolume(vol);
    focusSoundPlayer.setVolume(vol / 100);
  }

  function togglePlayback() {
    if (isPlaying) {
      focusSoundPlayer.stop();
      setIsPlaying(false);
    } else if (sound !== 'none') {
      focusSoundPlayer.play(sound, volume / 100);
      setIsPlaying(true);
    }
  }

  const currentOption = SOUND_OPTIONS.find(o => o.value === sound);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span>{currentOption?.icon}</span>
          <span className="hidden sm:inline">{currentOption?.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="font-medium">Focus Sounds</div>
          
          {/* Sound options */}
          <div className="grid grid-cols-4 gap-2">
            {SOUND_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSoundChange(option.value)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                  sound === option.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span className="text-xl">{option.icon}</span>
                <span className="text-xs">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Volume */}
          {sound !== 'none' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Volume</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={togglePlayback}
                >
                  {isPlaying ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### 6.3 Integrate into Focus Timer

Update focus timer to include sound picker:

```typescript
// In focus-timer.tsx
import { SoundPicker } from "./sound-picker";

// In the timer header/controls area:
<div className="flex items-center gap-2">
  <SoundPicker
    defaultSound={userPrefs?.focus_sound}
    defaultVolume={userPrefs?.focus_sound_volume}
    onSoundChange={(sound) => updateUserPreferences({ focus_sound: sound })}
  />
  {/* ... other controls */}
</div>
```

---

## Phase 7: Daily Planning Ritual

### 7.1 Planning Page

Create `app/(dashboard)/planning/page.tsx`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DailyPlanningFlow } from "@/components/planning/daily-planning-flow";
import { isToday, parseISO } from "date-fns";

export default async function PlanningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // Get user preferences
  const { data: prefs } = await supabase
    .from("zeroed_user_preferences")
    .select("last_daily_planning_at, daily_intention")
    .eq("user_id", user.id)
    .single();

  // Get yesterday's incomplete tasks
  const { data: carryover } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(name, color)")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .lt("due_date", new Date().toISOString().split("T")[0])
    .order("priority", { ascending: false });

  // Get today's tasks
  const today = new Date().toISOString().split("T")[0];
  const { data: todayTasks } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(name, color)")
    .eq("user_id", user.id)
    .eq("due_date", today)
    .neq("status", "completed")
    .order("priority", { ascending: false });

  // Get yesterday's stats
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: yesterdayStats } = await supabase
    .from("zeroed_daily_stats")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", yesterday)
    .single();

  const alreadyPlannedToday = prefs?.last_daily_planning_at 
    ? isToday(parseISO(prefs.last_daily_planning_at))
    : false;

  return (
    <DailyPlanningFlow
      carryoverTasks={carryover || []}
      todayTasks={todayTasks || []}
      yesterdayStats={yesterdayStats}
      previousIntention={prefs?.daily_intention}
      alreadyPlanned={alreadyPlannedToday}
    />
  );
}
```

### 7.2 Planning Flow Component

Create `components/planning/daily-planning-flow.tsx`:

```typescript
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sun, ArrowRight, Check, Calendar, Target, 
  Sparkles, Clock, ChevronRight, RotateCcw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { 
  completeDailyPlanning, 
  rescheduleTask, 
  deleteTask 
} from "@/app/(dashboard)/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Task } from "@/lib/supabase/types";

interface DailyPlanningFlowProps {
  carryoverTasks: Task[];
  todayTasks: Task[];
  yesterdayStats: any;
  previousIntention: string | null;
  alreadyPlanned: boolean;
}

const STEPS = [
  { id: 'review', title: 'Review Yesterday', icon: RotateCcw },
  { id: 'carryover', title: 'Handle Carryover', icon: Calendar },
  { id: 'today', title: "Today's Tasks", icon: Target },
  { id: 'intention', title: 'Set Intention', icon: Sparkles },
  { id: 'complete', title: 'Ready!', icon: Check },
];

export function DailyPlanningFlow({
  carryoverTasks,
  todayTasks,
  yesterdayStats,
  previousIntention,
  alreadyPlanned,
}: DailyPlanningFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(alreadyPlanned ? 4 : 0);
  const [selectedCarryover, setSelectedCarryover] = useState<Set<string>>(new Set());
  const [intention, setIntention] = useState("");
  const [topPriorities, setTopPriorities] = useState<string[]>([]);

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const step = STEPS[currentStep];
  const Icon = step.icon;

  async function handleCarryoverAction(taskId: string, action: 'today' | 'reschedule' | 'delete') {
    if (action === 'today') {
      await rescheduleTask(taskId, new Date().toISOString().split('T')[0]);
    } else if (action === 'reschedule') {
      // Reschedule to tomorrow
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await rescheduleTask(taskId, tomorrow);
    } else {
      await deleteTask(taskId);
    }
  }

  async function handleComplete() {
    await completeDailyPlanning({
      intention,
      top_priorities: topPriorities,
    });
    toast.success("Planning complete! Have a productive day 🚀");
    router.push("/today");
  }

  function nextStep() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <Progress value={progress} className="h-1" />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sun className="h-5 w-5" />
            <span className="text-sm">Morning Planning</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/today")}>
            Skip
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Step icon and title */}
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">{step.title}</h1>
              </div>

              {/* Step 0: Review Yesterday */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  {yesterdayStats ? (
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold">{yesterdayStats.tasks_completed}</p>
                          <p className="text-xs text-muted-foreground">Tasks Done</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold">{Math.round(yesterdayStats.focus_minutes / 60)}h</p>
                          <p className="text-xs text-muted-foreground">Focus Time</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold">{yesterdayStats.sessions_completed}</p>
                          <p className="text-xs text-muted-foreground">Sessions</p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      No data from yesterday. Let's make today count!
                    </p>
                  )}
                  
                  {previousIntention && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">Yesterday's intention:</p>
                        <p className="italic">"{previousIntention}"</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 1: Handle Carryover */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {carryoverTasks.length === 0 ? (
                    <p className="text-center text-muted-foreground">
                      No overdue tasks! You're on top of things 🎉
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground text-center">
                        {carryoverTasks.length} task{carryoverTasks.length > 1 ? 's' : ''} from previous days
                      </p>
                      <div className="space-y-2">
                        {carryoverTasks.map((task) => (
                          <Card key={task.id}>
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="flex-1">
                                <p className="font-medium">{task.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {task.zeroed_lists?.name || "No list"} • {task.estimated_minutes}m
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCarryoverAction(task.id, 'today')}
                                >
                                  Today
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCarryoverAction(task.id, 'reschedule')}
                                >
                                  Later
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Today's Tasks */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Select your top 3 priorities for today
                  </p>
                  <div className="space-y-2">
                    {todayTasks.map((task) => (
                      <Card
                        key={task.id}
                        className={topPriorities.includes(task.id) ? "border-primary" : ""}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <Checkbox
                            checked={topPriorities.includes(task.id)}
                            onCheckedChange={(checked) => {
                              if (checked && topPriorities.length < 3) {
                                setTopPriorities([...topPriorities, task.id]);
                              } else if (!checked) {
                                setTopPriorities(topPriorities.filter(id => id !== task.id));
                              }
                            }}
                            disabled={!topPriorities.includes(task.id) && topPriorities.length >= 3}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {task.estimated_minutes}m
                            </p>
                          </div>
                          {topPriorities.includes(task.id) && (
                            <span className="text-xs font-medium text-primary">
                              #{topPriorities.indexOf(task.id) + 1}
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {todayTasks.length === 0 && (
                    <p className="text-center text-muted-foreground">
                      No tasks scheduled for today yet.
                    </p>
                  )}
                </div>
              )}

              {/* Step 3: Set Intention */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    What do you want to accomplish today?
                  </p>
                  <Textarea
                    placeholder="Today I will focus on..."
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    className="min-h-[100px] text-center"
                  />
                </div>
              )}

              {/* Step 4: Complete */}
              {currentStep === 4 && (
                <div className="space-y-4 text-center">
                  <p className="text-4xl">🚀</p>
                  <p className="text-muted-foreground">
                    You're all set! Have a productive day.
                  </p>
                  {intention && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">Today's intention:</p>
                        <p className="italic">"{intention}"</p>
                      </CardContent>
                    </Card>
                  )}
                  {topPriorities.length > 0 && (
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground mb-2">Top priorities:</p>
                      {topPriorities.map((id, i) => {
                        const task = todayTasks.find(t => t.id === id);
                        return task ? (
                          <p key={id} className="flex items-center gap-2">
                            <span className="text-primary font-bold">{i + 1}.</span>
                            {task.title}
                          </p>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                {currentStep > 0 && currentStep < 4 && (
                  <Button variant="ghost" onClick={() => setCurrentStep(prev => prev - 1)}>
                    Back
                  </Button>
                )}
                <div className="flex-1" />
                {currentStep < 4 ? (
                  <Button onClick={nextStep}>
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleComplete}>
                    Start Day
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 8: Shutdown Routine

### 8.1 Shutdown Page

Create `app/(dashboard)/shutdown/page.tsx`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShutdownFlow } from "@/components/planning/shutdown-flow";

export default async function ShutdownPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  // Get today's completed tasks
  const { data: completedTasks } = await supabase
    .from("zeroed_tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("completed_at", `${today}T00:00:00`)
    .order("completed_at", { ascending: false });

  // Get incomplete tasks
  const { data: incompleteTasks } = await supabase
    .from("zeroed_tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("due_date", today)
    .neq("status", "completed");

  // Get today's stats
  const { data: todayStats } = await supabase
    .from("zeroed_daily_stats")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  // Get user's intention
  const { data: prefs } = await supabase
    .from("zeroed_user_preferences")
    .select("daily_intention")
    .eq("user_id", user.id)
    .single();

  return (
    <ShutdownFlow
      completedTasks={completedTasks || []}
      incompleteTasks={incompleteTasks || []}
      todayStats={todayStats}
      dailyIntention={prefs?.daily_intention}
    />
  );
}
```

### 8.2 Shutdown Flow Component

Create `components/planning/shutdown-flow.tsx`:

```typescript
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Moon, ArrowRight, Check, Trophy, 
  Calendar, Star, ChevronRight, Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { completeShutdown, rescheduleTask, snoozeTask } from "@/app/(dashboard)/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import type { Task } from "@/lib/supabase/types";

interface ShutdownFlowProps {
  completedTasks: Task[];
  incompleteTasks: Task[];
  todayStats: any;
  dailyIntention: string | null;
}

const STEPS = [
  { id: 'celebrate', title: 'Celebrate Wins', icon: Trophy },
  { id: 'review', title: 'Review Incomplete', icon: Calendar },
  { id: 'reflect', title: 'Reflect', icon: Star },
  { id: 'complete', title: 'Shutdown Complete', icon: Moon },
];

export function ShutdownFlow({
  completedTasks,
  incompleteTasks,
  todayStats,
  dailyIntention,
}: ShutdownFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [reflection, setReflection] = useState("");
  const [gratitude, setGratitude] = useState("");

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const step = STEPS[currentStep];
  const Icon = step.icon;

  function triggerCelebration() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  async function handleIncompleteAction(taskId: string, action: 'tomorrow' | 'next_week' | 'delete') {
    if (action === 'tomorrow') {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await rescheduleTask(taskId, tomorrow);
    } else if (action === 'next_week') {
      await snoozeTask(taskId, 'next_week');
    }
    toast.success("Task rescheduled");
  }

  async function handleComplete() {
    await completeShutdown({
      reflection,
      gratitude,
    });
    toast.success("Great work today! See you tomorrow 🌙");
    router.push("/today");
  }

  function nextStep() {
    if (currentStep === 0 && completedTasks.length > 0) {
      triggerCelebration();
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-indigo-950/20 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <Progress value={progress} className="h-1" />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Moon className="h-5 w-5" />
            <span className="text-sm">Evening Shutdown</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/today")}>
            Skip
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Step icon and title */}
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">{step.title}</h1>
              </div>

              {/* Step 0: Celebrate */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  {todayStats && (
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold text-green-500">{completedTasks.length}</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold">{Math.round((todayStats.focus_minutes || 0) / 60)}h</p>
                          <p className="text-xs text-muted-foreground">Focus Time</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold">{todayStats.sessions_completed || 0}</p>
                          <p className="text-xs text-muted-foreground">Sessions</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {completedTasks.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground text-center">
                        You crushed it today! 🎉
                      </p>
                      {completedTasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-center gap-2 p-2 rounded bg-green-500/10">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{task.title}</span>
                        </div>
                      ))}
                      {completedTasks.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{completedTasks.length - 5} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      Tomorrow is a new opportunity. Rest up!
                    </p>
                  )}

                  {dailyIntention && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">Today's intention:</p>
                        <p className="italic">"{dailyIntention}"</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 1: Review Incomplete */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {incompleteTasks.length === 0 ? (
                    <div className="text-center">
                      <Sparkles className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                      <p className="text-muted-foreground">
                        All tasks complete! Perfect day 🌟
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground text-center">
                        {incompleteTasks.length} task{incompleteTasks.length > 1 ? 's' : ''} didn't get done. Where should they go?
                      </p>
                      <div className="space-y-2">
                        {incompleteTasks.map((task) => (
                          <Card key={task.id}>
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="flex-1">
                                <p className="font-medium">{task.title}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleIncompleteAction(task.id, 'tomorrow')}
                                >
                                  Tomorrow
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleIncompleteAction(task.id, 'next_week')}
                                >
                                  Next Week
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Reflect */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">What went well today?</p>
                    <Textarea
                      placeholder="I'm proud that..."
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">What are you grateful for?</p>
                    <Textarea
                      placeholder="I'm grateful for..."
                      value={gratitude}
                      onChange={(e) => setGratitude(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Complete */}
              {currentStep === 3 && (
                <div className="space-y-4 text-center">
                  <p className="text-4xl">🌙</p>
                  <p className="text-xl font-medium">Shutdown Complete</p>
                  <p className="text-muted-foreground">
                    Work is done for the day. Time to rest and recharge.
                  </p>
                  <Card className="text-left">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Completed:</span>{" "}
                        <span className="font-medium">{completedTasks.length} tasks</span>
                      </p>
                      {reflection && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Reflection:</span>{" "}
                          <span className="italic">"{reflection}"</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                {currentStep > 0 && currentStep < 3 && (
                  <Button variant="ghost" onClick={() => setCurrentStep(prev => prev - 1)}>
                    Back
                  </Button>
                )}
                <div className="flex-1" />
                {currentStep < 3 ? (
                  <Button onClick={nextStep}>
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleComplete}>
                    Done for Today
                    <Moon className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
```

---

## Testing Checklist

### Smart Filters
- [ ] Create filter with conditions
- [ ] Save filter with name/icon/color
- [ ] Execute filter returns correct tasks
- [ ] Preset filters work
- [ ] Pin filter to sidebar
- [ ] Delete filter

### Snooze
- [ ] Snooze to tomorrow
- [ ] Snooze to next week
- [ ] Snooze to custom date
- [ ] Snoozed tasks hidden from today
- [ ] Unsnooze works
- [ ] Undo snooze via toast

### Start Date
- [ ] Set start date on task
- [ ] Tasks with future start date hidden
- [ ] Start date <= due date validation

### Archive
- [ ] Completed tasks auto-archive
- [ ] Search archive
- [ ] Group by date
- [ ] Stats display

### Undo
- [ ] Complete → Undo
- [ ] Delete → Undo
- [ ] Snooze → Undo
- [ ] Expires after 5 minutes
- [ ] Cmd+Z shortcut

### Focus Sounds
- [ ] All sounds play
- [ ] Volume control
- [ ] Persists preference
- [ ] Stops on session end

### Daily Planning
- [ ] Review yesterday stats
- [ ] Handle carryover tasks
- [ ] Select top priorities
- [ ] Set intention
- [ ] Completion persists

### Shutdown Routine
- [ ] Celebrate wins
- [ ] Reschedule incomplete
- [ ] Reflection input
- [ ] Completion persists

---

## Dependencies

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

**Audio files needed in `/public/sounds/`:**
- rain.mp3
- cafe.mp3
- lofi.mp3
- whitenoise.mp3
- nature.mp3
- fireplace.mp3
- ocean.mp3

(Use royalty-free sources like Pixabay, Freesound, or Epidemic Sound)

---

## Files Summary

**New Files:**
- `lib/filters/engine.ts`
- `components/filters/filter-builder.tsx`
- `components/filters/save-filter-dialog.tsx`
- `components/tasks/snooze-picker.tsx`
- `components/archive/archive-list.tsx`
- `components/archive/archive-stats.tsx`
- `app/(dashboard)/archive/page.tsx`
- `lib/hooks/use-undo.ts`
- `lib/audio/focus-sounds.ts`
- `components/focus/sound-picker.tsx`
- `app/(dashboard)/planning/page.tsx`
- `components/planning/daily-planning-flow.tsx`
- `app/(dashboard)/shutdown/page.tsx`
- `components/planning/shutdown-flow.tsx`

**Database Changes:**
- `zeroed_smart_filters` table
- `zeroed_archive` table + trigger
- `zeroed_undo_history` table
- `start_date`, `snoozed_until` columns on tasks
- Planning preferences on user_preferences

---

**Sprint 8 complete. This is the "make it sticky" sprint. 🎯**
