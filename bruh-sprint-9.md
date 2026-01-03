# Bruh - Sprint 9: The Rebrand

> *"Same app. Unhinged energy."*

---

## Brand Identity

### Core Info
- **Name:** Bruh
- **Domain:** getbruh.app
- **Tagline:** "Get your shit together."
- **Alternative taglines:**
  - "Tasks, handled."
  - "Zero excuses."
  - "Productivity, but make it chaotic."

---

## Color System

### Palette

```typescript
// lib/theme/colors.ts

export const colors = {
  // Core
  black: '#0a0a0a',
  orange: '#ff6b00',
  white: '#ffffff',
  
  // Surfaces
  surface: {
    base: '#0a0a0a',
    raised: '#141414',
    elevated: '#1a1a1a',
    overlay: '#222222',
  },
  
  // Text
  text: {
    primary: '#ffffff',
    secondary: '#888888',
    muted: '#555555',
    inverse: '#0a0a0a',
  },
  
  // Accent (Orange spectrum)
  accent: {
    DEFAULT: '#ff6b00',
    hover: '#ff8533',
    muted: '#ff6b0020',
    subtle: '#ff6b0010',
  },
  
  // Semantic
  success: '#00ff66',
  warning: '#ffcc00',
  danger: '#ff3366',
  info: '#0099ff',
  
  // Semantic muted (for backgrounds)
  successMuted: '#00ff6615',
  warningMuted: '#ffcc0015',
  dangerMuted: '#ff336615',
  infoMuted: '#0099ff15',
} as const;
```

### Tailwind Config

```typescript
// tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bruh: {
          black: '#0a0a0a',
          orange: '#ff6b00',
          'orange-hover': '#ff8533',
        },
        surface: {
          base: '#0a0a0a',
          raised: '#141414',
          elevated: '#1a1a1a',
          overlay: '#222222',
        },
        success: '#00ff66',
        warning: '#ffcc00',
        danger: '#ff3366',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-orange': 'pulseOrange 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        pulseOrange: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 107, 0, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255, 107, 0, 0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Typography

### Font Stack

```css
/* app/globals.css */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Space Grotesk', var(--font-sans);
  --font-mono: 'JetBrains Mono', monospace;
}
```

### Usage Guidelines

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Logo/Brand | Space Grotesk | 700 | 24px |
| Page titles | Space Grotesk | 600 | 32px |
| Section headers | Inter | 600 | 20px |
| Body | Inter | 400 | 14px |
| Labels | Inter | 500 | 12px |
| Timer/Stats | JetBrains Mono | 500 | varies |
| Buttons | Inter | 600 | 14px |

---

## Voice & Microcopy

### Principles
1. **Direct** — No fluff. Say it straight.
2. **Self-aware** — We know productivity apps are a meme.
3. **Encouraging** — Supportive without being cringe.
4. **Unhinged (tastefully)** — Funny but not annoying.

### Copy Bank

#### Empty States

```typescript
// lib/copy/empty-states.ts

export const emptyStates = {
  inbox: [
    "Nothing here. Suspicious.",
    "Inbox zero. Touch grass.",
    "Empty. Either you're crushing it or lying to yourself.",
  ],
  today: [
    "No tasks today. Sure about that?",
    "Today is empty. That's either freedom or denial.",
    "Nothing due today. Enjoy it while it lasts.",
  ],
  completed: [
    "No completed tasks yet. We believe in you.",
    "Completed list is empty. Time to change that.",
    "Nothing done yet. Day's not over.",
  ],
  search: [
    "No results. Try something else.",
    "Couldn't find that. It's hiding.",
    "Nothing matches. Maybe it doesn't exist.",
  ],
  project: [
    "This project is empty. Fill it with regret.",
    "No tasks yet. The calm before the storm.",
    "Empty project energy. Add something.",
  ],
} as const;

export const getEmptyState = (type: keyof typeof emptyStates): string => {
  const options = emptyStates[type];
  return options[Math.floor(Math.random() * options.length)];
};
```

#### Task Completion

```typescript
// lib/copy/completion.ts

export const completionMessages = {
  single: [
    "Handled.",
    "Done.",
    "Let's go.",
    "That's what I thought.",
    "One down.",
    "✓",
  ],
  streak: [
    "You're on one.",
    "Keep going.",
    "Momentum.",
    "Stack 'em up.",
  ],
  bigTask: [
    "LETS GOOO",
    "That was a big one. Respect.",
    "Huge. Absolutely huge.",
  ],
  lastOfDay: [
    "Day cleared. Go home.",
    "That's everything. Touch grass.",
    "All done. You earned it.",
  ],
} as const;
```

#### Overdue & Warnings

```typescript
// lib/copy/warnings.ts

export const overdueMessages = [
  "bruh.",
  "This ain't it.",
  "We need to talk.",
  "Overdue. Handle it.",
  "Past due. Not great.",
];

export const warningMessages = {
  almostDue: [
    "Due soon. Heads up.",
    "Clock's ticking.",
    "This is due today.",
  ],
  manyOverdue: [
    "Multiple tasks overdue. bruh.",
    "You've got some catching up to do.",
    "Several things need attention.",
  ],
  streakRisk: [
    "Streak at risk. Don't break it.",
    "One task away from keeping the streak.",
    "Streak ends today unless...",
  ],
};
```

#### Encouragement & Streaks

```typescript
// lib/copy/encouragement.ts

export const streakMessages = {
  maintained: [
    "Consistency looks good on you.",
    "Streak intact. Keep it up.",
    "Another day, another W.",
  ],
  broken: [
    "Streak broken. It happens.",
    "Start again. That's all you can do.",
    "Reset. Go again.",
  ],
  milestone: {
    7: "Week streak. Solid.",
    14: "Two weeks. You're different.",
    30: "Month streak. Certified consistent.",
    60: "60 days. What are you, a machine?",
    90: "90 days. This is your personality now.",
    100: "100 DAYS. LEGENDARY.",
    365: "One year. You absolute psychopath.",
  },
};
```

#### Focus Mode / Timer

```typescript
// lib/copy/focus.ts

export const focusMessages = {
  start: [
    "Lock in.",
    "Focus mode. No distractions.",
    "Time to work.",
  ],
  halfway: [
    "Halfway there.",
    "Keep going.",
    "Solid progress.",
  ],
  almostDone: [
    "Almost there.",
    "Final stretch.",
    "Finish strong.",
  ],
  complete: [
    "Session complete. Nice.",
    "Time's up. Good work.",
    "Done. Take a break.",
  ],
  breakStart: [
    "Break time. Step away.",
    "Rest. You earned it.",
    "Take 5. Or 15. Whatever.",
  ],
};
```

#### Onboarding

```typescript
// lib/copy/onboarding.ts

export const onboardingCopy = {
  welcome: {
    title: "bruh.",
    subtitle: "Let's get your shit together.",
  },
  steps: [
    {
      title: "Add tasks",
      description: "Brain dump everything. We'll sort it out.",
    },
    {
      title: "Set due dates",
      description: "Or don't. We're not your mom.",
    },
    {
      title: "Get it done",
      description: "Check things off. Feel good. Repeat.",
    },
  ],
  complete: {
    title: "You're in.",
    description: "No more excuses. Let's go.",
  },
};
```

---

## Component Updates

### Logo Component

```tsx
// components/brand/logo.tsx

import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-2xl' },
    lg: { icon: 48, text: 'text-4xl' },
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Icon: stylized "B" or abstract mark */}
      <div 
        className="flex items-center justify-center rounded-lg bg-bruh-orange"
        style={{ 
          width: sizes[size].icon, 
          height: sizes[size].icon 
        }}
      >
        <span 
          className="font-display font-bold text-bruh-black"
          style={{ fontSize: sizes[size].icon * 0.5 }}
        >
          B
        </span>
      </div>
      
      {showText && (
        <span className={cn(
          'font-display font-bold tracking-tight text-white',
          sizes[size].text
        )}>
          bruh
        </span>
      )}
    </div>
  );
}
```

### Button Variants

```tsx
// components/ui/button.tsx

import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bruh-orange focus-visible:ring-offset-2 focus-visible:ring-offset-bruh-black disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-bruh-orange text-bruh-black hover:bg-bruh-orange-hover',
        secondary: 'bg-surface-elevated text-white hover:bg-surface-overlay',
        ghost: 'text-white hover:bg-surface-raised',
        outline: 'border border-surface-overlay text-white hover:bg-surface-raised',
        danger: 'bg-danger text-white hover:bg-danger/90',
        success: 'bg-success text-bruh-black hover:bg-success/90',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);
```

### Task Item Component

```tsx
// components/tasks/task-item.tsx

'use client';

import { useState } from 'react';
import { Check, Calendar, Flag, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/types';
import { completionMessages } from '@/lib/copy/completion';

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export function TaskItem({ task, onComplete, onEdit }: TaskItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);

  const handleComplete = async () => {
    setIsCompleting(true);
    
    // Pick random completion message
    const messages = completionMessages.single;
    setCompletionMessage(messages[Math.floor(Math.random() * messages.length)]);
    
    // Delay for animation
    await new Promise(resolve => setTimeout(resolve, 300));
    onComplete(task.id);
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed_at;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg transition-all',
        'hover:bg-surface-raised',
        isCompleting && 'opacity-50 scale-98',
        isOverdue && 'border-l-2 border-danger'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleComplete}
        className={cn(
          'flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 transition-all',
          'flex items-center justify-center',
          isCompleting 
            ? 'bg-bruh-orange border-bruh-orange' 
            : 'border-surface-overlay hover:border-bruh-orange'
        )}
      >
        {isCompleting && <Check className="w-3 h-3 text-bruh-black" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-white text-sm',
          isCompleting && 'line-through text-text-muted'
        )}>
          {task.title}
        </p>
        
        {/* Meta info */}
        <div className="flex items-center gap-3 mt-1">
          {task.due_date && (
            <span className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-danger' : 'text-text-secondary'
            )}>
              <Calendar className="w-3 h-3" />
              {isOverdue ? 'bruh. overdue' : formatDate(task.due_date)}
            </span>
          )}
          
          {task.priority && task.priority > 1 && (
            <span className="flex items-center gap-1 text-xs text-bruh-orange">
              <Flag className="w-3 h-3" />
              P{task.priority}
            </span>
          )}
        </div>

        {/* Completion message toast */}
        {completionMessage && (
          <span className="inline-block mt-1 text-xs text-success animate-fade-in">
            {completionMessage}
          </span>
        )}
      </div>

      {/* Actions */}
      <button 
        onClick={() => onEdit(task)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-elevated rounded transition-all"
      >
        <MoreHorizontal className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  );
}

function formatDate(date: string): string {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

### Empty State Component

```tsx
// components/ui/empty-state.tsx

import { getEmptyState } from '@/lib/copy/empty-states';
import { Inbox, CheckCircle, Search, FolderOpen, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateType = 'inbox' | 'today' | 'completed' | 'search' | 'project';

interface EmptyStateProps {
  type: EmptyStateType;
  className?: string;
}

const icons = {
  inbox: Inbox,
  today: Calendar,
  completed: CheckCircle,
  search: Search,
  project: FolderOpen,
};

export function EmptyState({ type, className }: EmptyStateProps) {
  const Icon = icons[type];
  const message = getEmptyState(type);

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 text-center',
      className
    )}>
      <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-text-muted" />
      </div>
      <p className="text-text-secondary text-sm max-w-[200px]">
        {message}
      </p>
    </div>
  );
}
```

---

## Page Updates

### Dashboard Header

```tsx
// components/layout/dashboard-header.tsx

'use client';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Search } from 'lucide-react';
import { useTaskStats } from '@/hooks/use-task-stats';

export function DashboardHeader() {
  const stats = useTaskStats();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };

  const getSubtext = () => {
    if (stats.overdue > 3) return "You've got some catching up to do.";
    if (stats.overdue > 0) return `${stats.overdue} overdue. Handle it.`;
    if (stats.dueToday > 5) return "Busy day. Lock in.";
    if (stats.dueToday > 0) return `${stats.dueToday} tasks today. You got this.`;
    if (stats.completedToday > 0) return "Solid progress today.";
    return "Ready when you are.";
  };

  return (
    <header className="flex items-center justify-between py-6 px-4 border-b border-surface-elevated">
      <div>
        <h1 className="text-2xl font-display font-semibold text-white">
          {getGreeting()}.
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {getSubtext()}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Search className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
        <Button size="md">
          <Plus className="w-4 h-4 mr-2" />
          Add task
        </Button>
      </div>
    </header>
  );
}
```

---

## Static Assets

### Favicon & App Icons

```
/public
├── favicon.ico          # 32x32
├── favicon-16x16.png
├── favicon-32x32.png
├── apple-touch-icon.png # 180x180
├── icon-192.png         # PWA
├── icon-512.png         # PWA
├── og-image.png         # 1200x630 for social
└── manifest.json
```

### Manifest Update

```json
// public/manifest.json
{
  "name": "Bruh",
  "short_name": "Bruh",
  "description": "Get your shit together.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#ff6b00",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Landing Page

### Hero Section

```tsx
// app/(marketing)/page.tsx

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bruh-black">
      {/* Nav */}
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-text-secondary hover:text-white transition">
            Log in
          </Link>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
        <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6">
          Get your shit
          <br />
          <span className="text-bruh-orange">together.</span>
        </h1>
        
        <p className="text-xl text-text-secondary max-w-lg mx-auto mb-10">
          A task manager that doesn't take itself too seriously. 
          But takes your productivity very seriously.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/signup">Start for free</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="#features">See features</Link>
          </Button>
        </div>

        {/* Social proof or screenshot */}
        <div className="mt-16">
          <p className="text-xs text-text-muted mb-4 uppercase tracking-wider">
            For people who have too much to do
          </p>
          {/* App screenshot mockup */}
          <div className="relative mx-auto max-w-3xl">
            <div className="bg-surface-raised rounded-xl border border-surface-overlay p-4 shadow-2xl">
              {/* Placeholder for app screenshot */}
              <div className="aspect-video bg-surface-elevated rounded-lg" />
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-display font-bold text-white text-center mb-16">
          Everything you need. Nothing you don't.
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="p-6 rounded-xl bg-surface-raised">
              <div className="w-10 h-10 rounded-lg bg-bruh-orange/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-bruh-orange" />
              </div>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl font-display font-bold text-white mb-4">
          Ready?
        </h2>
        <p className="text-text-secondary mb-8">
          Free forever. No credit card. No excuses.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup">Let's go</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-elevated py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Bruh. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Zap,
    title: 'Fast af',
    description: 'Add tasks in seconds. No friction. No forms. Just type and go.',
  },
  {
    icon: Timer,
    title: 'Focus mode',
    description: 'Pomodoro timer built in. Lock in and get it done.',
  },
  {
    icon: Repeat,
    title: 'Recurring tasks',
    description: 'Daily, weekly, monthly. Set it and forget it.',
  },
  {
    icon: FolderKanban,
    title: 'Projects',
    description: 'Group tasks. Stay organized. Or don\'t. We\'re not judging.',
  },
  {
    icon: BarChart3,
    title: 'Stats',
    description: 'See your productivity trends. Flex on yourself.',
  },
  {
    icon: Smartphone,
    title: 'Works everywhere',
    description: 'Web, mobile, offline. Your tasks follow you.',
  },
];
```

---

## Migration Checklist

### Codebase Updates

- [ ] Rename repo from `zeroed` to `bruh`
- [ ] Update `package.json` name and description
- [ ] Update all import paths referencing old name
- [ ] Replace old color variables
- [ ] Swap font imports
- [ ] Update meta tags (title, description, og:tags)
- [ ] Update manifest.json
- [ ] Replace all static assets (favicon, icons, og-image)
- [ ] Update email templates
- [ ] Update error pages (404, 500)

### Copy Updates

- [ ] Replace all microcopy with new voice
- [ ] Update empty states
- [ ] Update notifications/toasts
- [ ] Update onboarding flow
- [ ] Update settings page copy
- [ ] Update email copy

### Infrastructure

- [ ] Update Vercel project name
- [ ] Configure new domain (getbruh.app)
- [ ] Update environment variables
- [ ] Update Supabase project name (optional)
- [ ] Update analytics/tracking IDs
- [ ] Update error tracking (Sentry) project

### Launch

- [ ] Design social assets (Twitter, LinkedIn)
- [ ] Write launch tweet thread
- [ ] Prepare Product Hunt launch (optional)
- [ ] Set up redirect from old domain (if any)

---

## Timeline Estimate

| Task | Estimate |
|------|----------|
| Color/theme system | 2 hours |
| Typography setup | 1 hour |
| Component updates | 4 hours |
| Microcopy implementation | 3 hours |
| Static assets (icons, etc.) | 2 hours |
| Landing page | 4 hours |
| Testing & polish | 2 hours |
| **Total** | **~18 hours** |

---

## Notes

The rebrand isn't just cosmetic — the voice and personality should come through in every interaction. Every empty state, every toast, every error message is a chance to reinforce the brand.

Keep it funny but not annoying. The humor should enhance the experience, not distract from getting shit done.

**Remember:** The app is still a serious productivity tool. The branding is unhinged. The functionality is not.

*bruh. let's go.*
