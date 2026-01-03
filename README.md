# Zeroed

> Zero in. Get it done.

A productivity and focus app built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Task Management**: Organize tasks in lists, set priorities, and track time estimates
- **Focus Timer**: Pomodoro-style focus sessions with customizable durations
- **Analytics**: Track completed tasks, focus time, and estimation accuracy
- **Dark Mode**: Beautiful dark theme with light mode support
- **Keyboard First**: Global shortcuts for quick navigation

## Tech Stack

- **Framework**: Next.js 14+ (App Router, Server Components, Server Actions)
- **Database**: Supabase (Postgres with RLS)
- **Auth**: Supabase Auth (email/password + magic link)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand for timer state
- **Animations**: Framer Motion

## Getting Started

1. Clone the repository
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials
3. Run the database migrations in Supabase (see `zeroed-claude-code-prompt.md` for schema)
4. Install dependencies:

```bash
npm install
```

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## License

MIT
