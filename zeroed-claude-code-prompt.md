# Zeroed — Claude Code Bootstrap Prompt

Copy everything below the line into Claude Code with an empty `productivity` repo.

---

## Project Context

Build "Zeroed" — a productivity/focus app inspired by Blitzit. Multi-user SaaS for a small team. Users can sign up, manage tasks with time estimates, enter focus mode with a countdown timer, track actual vs estimated time, and view productivity analytics.

## Tech Stack

- **Framework:** Next.js 14+ (App Router, Server Components, Server Actions)
- **Database:** Supabase (Postgres) — IMPORTANT: prefix all tables with `zeroed_` as this is a shared environment
- **Auth:** Supabase Auth (email/password + magic link)
- **Realtime:** Supabase Realtime for cross-device sync
- **Background Jobs:** Inngest (reminders, daily summaries)
- **Push Notifications:** Vapid/Web Push (optional v2)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Deployment:** Vercel

## Branding & Design

**Name:** Zeroed
**Tagline:** "Zero in. Get it done."

**Theme:** Dark & Electric
- Dark mode default, light mode available
- Premium, techy, Linear/Vercel energy

**Color Palette:**
```
/* Dark Mode (Default) */
--background: #0a0a0b
--surface: #141416
--surface-elevated: #1c1c1f
--border: #2a2a2e
--text-primary: #fafafa
--text-secondary: #a1a1aa
--text-muted: #71717a
--accent: #6366f1 /* Electric indigo */
--accent-hover: #818cf8
--accent-muted: #4f46e5
--success: #22c55e
--warning: #f59e0b
--error: #ef4444

/* Light Mode */
--background: #fafafa
--surface: #ffffff
--surface-elevated: #f4f4f5
--border: #e4e4e7
--text-primary: #09090b
--text-secondary: #52525b
--text-muted: #a1a1aa
--accent: #4f46e5
--accent-hover: #6366f1
--accent-muted: #6366f1
--success: #16a34a
--warning: #d97706
--error: #dc2626
```

**Typography:**
- Font: Inter (or Geist if available)
- Headings: Semi-bold
- Body: Regular

**Design Principles:**
- Minimal, focused UI — no clutter
- Generous whitespace
- Subtle animations (task completion, timer pulse)
- Keyboard-first navigation

## Database Schema

All tables prefixed with `zeroed_`. Use Supabase RLS for user isolation.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Lists (task containers)
create table zeroed_lists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#6366f1',
  icon text default 'list',
  position integer default 0,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks
create table zeroed_tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  list_id uuid references zeroed_lists(id) on delete cascade not null,
  title text not null,
  notes text,
  estimated_minutes integer default 25,
  actual_minutes integer default 0,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_date date,
  due_time time,
  position integer default 0,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Focus Sessions (Pomodoro/timer tracking)
create table zeroed_focus_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references zeroed_tasks(id) on delete set null,
  duration_minutes integer not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  completed boolean default false,
  session_type text default 'focus' check (session_type in ('focus', 'short_break', 'long_break')),
  created_at timestamptz default now()
);

-- User Preferences
create table zeroed_user_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  theme text default 'dark' check (theme in ('dark', 'light', 'system')),
  default_focus_minutes integer default 25,
  short_break_minutes integer default 5,
  long_break_minutes integer default 15,
  sessions_before_long_break integer default 4,
  sound_enabled boolean default true,
  notifications_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Daily Stats (aggregated for performance)
create table zeroed_daily_stats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  tasks_completed integer default 0,
  tasks_created integer default 0,
  focus_minutes integer default 0,
  sessions_completed integer default 0,
  estimated_minutes integer default 0,
  actual_minutes integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- RLS Policies
alter table zeroed_lists enable row level security;
alter table zeroed_tasks enable row level security;
alter table zeroed_focus_sessions enable row level security;
alter table zeroed_user_preferences enable row level security;
alter table zeroed_daily_stats enable row level security;

-- Users can only access their own data
create policy "Users can CRUD own lists" on zeroed_lists
  for all using (auth.uid() = user_id);

create policy "Users can CRUD own tasks" on zeroed_tasks
  for all using (auth.uid() = user_id);

create policy "Users can CRUD own focus sessions" on zeroed_focus_sessions
  for all using (auth.uid() = user_id);

create policy "Users can CRUD own preferences" on zeroed_user_preferences
  for all using (auth.uid() = user_id);

create policy "Users can CRUD own daily stats" on zeroed_daily_stats
  for all using (auth.uid() = user_id);

-- Indexes for performance
create index zeroed_tasks_user_id_idx on zeroed_tasks(user_id);
create index zeroed_tasks_list_id_idx on zeroed_tasks(list_id);
create index zeroed_tasks_status_idx on zeroed_tasks(status);
create index zeroed_tasks_due_date_idx on zeroed_tasks(due_date);
create index zeroed_focus_sessions_user_id_idx on zeroed_focus_sessions(user_id);
create index zeroed_daily_stats_user_date_idx on zeroed_daily_stats(user_id, date);

-- Updated_at trigger function
create or replace function zeroed_handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger zeroed_lists_updated_at before update on zeroed_lists
  for each row execute function zeroed_handle_updated_at();

create trigger zeroed_tasks_updated_at before update on zeroed_tasks
  for each row execute function zeroed_handle_updated_at();

create trigger zeroed_user_preferences_updated_at before update on zeroed_user_preferences
  for each row execute function zeroed_handle_updated_at();

create trigger zeroed_daily_stats_updated_at before update on zeroed_daily_stats
  for each row execute function zeroed_handle_updated_at();
```

## Project Structure

```
productivity/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx                 # Today's tasks + quick actions
│   │   ├── lists/
│   │   │   ├── page.tsx             # All lists
│   │   │   └── [listId]/page.tsx    # Single list view
│   │   ├── focus/page.tsx           # Focus mode (timer)
│   │   ├── stats/page.tsx           # Productivity analytics
│   │   ├── settings/page.tsx        # User preferences
│   │   └── layout.tsx               # Dashboard shell + sidebar
│   ├── api/
│   │   └── inngest/route.ts         # Inngest webhook
│   ├── layout.tsx
│   ├── page.tsx                     # Landing/marketing page
│   └── globals.css
├── components/
│   ├── ui/                          # shadcn components
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── signup-form.tsx
│   ├── dashboard/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── command-menu.tsx         # Cmd+K actions
│   ├── lists/
│   │   ├── list-card.tsx
│   │   ├── list-form.tsx
│   │   └── list-grid.tsx
│   ├── tasks/
│   │   ├── task-item.tsx
│   │   ├── task-form.tsx
│   │   ├── task-list.tsx
│   │   └── task-completion-animation.tsx
│   ├── focus/
│   │   ├── focus-timer.tsx
│   │   ├── focus-controls.tsx
│   │   ├── focus-task-display.tsx
│   │   └── focus-complete-modal.tsx
│   ├── stats/
│   │   ├── stats-overview.tsx
│   │   ├── stats-chart.tsx
│   │   └── punctuality-report.tsx
│   └── theme/
│       └── theme-provider.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser client
│   │   ├── server.ts                # Server client
│   │   ├── middleware.ts            # Auth middleware helper
│   │   └── types.ts                 # Generated types
│   ├── inngest/
│   │   ├── client.ts
│   │   └── functions/
│   │       ├── daily-summary.ts
│   │       └── reminder.ts
│   ├── hooks/
│   │   ├── use-tasks.ts
│   │   ├── use-lists.ts
│   │   ├── use-timer.ts
│   │   ├── use-focus-session.ts
│   │   └── use-keyboard-shortcuts.ts
│   ├── utils.ts                     # cn() helper, etc.
│   └── constants.ts                 # App constants
├── middleware.ts                    # Supabase auth middleware
├── tailwind.config.ts
├── next.config.js
├── package.json
└── .env.local.example
```

## Environment Variables

```env
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# Vapid (for push notifications - v2)
# VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY=
# VAPID_SUBJECT=mailto:your@email.com
```

## Key Features to Implement

### 1. Authentication Flow
- Email/password signup with email confirmation
- Magic link option
- Redirect to /login if unauthenticated
- Create default "Inbox" list on first signup
- Initialize user preferences on signup

### 2. Dashboard (Today View)
- Show tasks due today across all lists
- Quick add task (Cmd+N)
- Start focus mode button
- Today's stats summary (tasks completed, focus time)
- Recent activity

### 3. Lists Management
- Create, edit, delete, archive lists
- Drag-and-drop reorder
- Color picker for list accent
- Default "Inbox" list (cannot be deleted)

### 4. Task Management
- Create with title, notes, time estimate, priority, due date
- Inline editing
- Drag-and-drop between lists and reorder
- Mark complete with animation
- Keyboard shortcuts (e for edit, d for done, Delete for remove)

### 5. Focus Mode (Core Feature)
- Select task to focus on
- Countdown timer (default 25 min, customizable)
- Large, centered display
- Pause/resume/stop controls
- Track actual time spent
- Completion celebration (confetti + encouraging message)
- Auto-suggest break after session
- Pomodoro tracking (sessions until long break)

### 6. Timer Component Behavior
```typescript
// Timer states
type TimerState = 'idle' | 'running' | 'paused' | 'break' | 'completed';

// Timer should:
// - Persist across page navigation (use context or URL state)
// - Show in header/navbar when running but not on focus page
// - Play sound on completion (if enabled)
// - Request notification permission and notify on completion
// - Update task.actual_minutes on stop/complete
// - Create focus_session record
```

### 7. Stats/Analytics
- Daily/weekly/monthly views
- Tasks completed chart
- Focus time chart
- Estimated vs actual accuracy
- Streak tracking (consecutive days with completed tasks)
- Best focus day/time insights

### 8. Settings
- Theme toggle (dark/light/system)
- Default focus duration
- Break durations
- Sound on/off
- Notification preferences

### 9. Keyboard Shortcuts (Global)
- `Cmd+K` — Command menu
- `Cmd+N` — New task
- `Cmd+Shift+F` — Start focus mode
- `Escape` — Close modals/cancel
- `?` — Show shortcuts help

## Component Patterns

### Task Completion Animation
```tsx
// Use framer-motion for satisfying completion
// Scale down + fade + checkmark animation
// Optional confetti burst for focus session completion
```

### Focus Timer Display
```tsx
// Large monospace numbers
// Subtle pulse animation when running
// Progress ring around time
// Task title displayed below
// Keyboard: Space to pause/resume, Escape to stop
```

### Realtime Sync
```tsx
// Subscribe to Supabase realtime for tasks table
// Update UI optimistically
// Handle conflicts gracefully
```

## Inngest Functions

### Daily Summary (runs at user's preferred time or 6 PM default)
- Count tasks completed today
- Total focus time
- Could send email digest (v2)

### Task Reminder
- Triggered when task has due_time set
- Send push notification (if enabled)
- Show in-app notification

## Important Implementation Notes

1. **Server Components by default** — Only use 'use client' when needed for interactivity
2. **Server Actions for mutations** — Use for create/update/delete operations
3. **Optimistic updates** — Update UI immediately, revert on error
4. **Mobile responsive** — Works on phone, but optimized for desktop
5. **Accessible** — Proper ARIA labels, keyboard navigation, focus management
6. **Error boundaries** — Graceful error handling with recovery options

## Initial Setup Commands

```bash
# Create Next.js app
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install inngest
npm install framer-motion
npm install lucide-react
npm install date-fns
npm install zustand                    # For timer state management
npm install sonner                     # Toast notifications
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-slot @radix-ui/react-tooltip
npm install class-variance-authority clsx tailwind-merge
npm install cmdk                       # Command menu

# Dev dependencies
npm install -D @types/node prettier

# Initialize shadcn
npx shadcn@latest init
# Choose: New York style, Zinc base color, CSS variables: yes

# Add shadcn components
npx shadcn@latest add button card dialog dropdown-menu input label separator tooltip command avatar badge progress
```

## Start Building

Begin with:
1. Set up Supabase client and auth middleware
2. Create the auth pages (login/signup)
3. Build the dashboard layout with sidebar
4. Implement task CRUD with a single list
5. Build the focus timer
6. Add more features incrementally

Remember: Ship fast, iterate. Get the timer working first — that's the core value prop.

---

**Ready to build. Good luck!** 🎯
