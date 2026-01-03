# Bruh

> Get your shit together.

A task manager that doesn't take itself too seriously. But takes your productivity very seriously.

## Features

- **Fast af**: Add tasks in seconds. No friction. No forms. Just type and go.
- **Brain Dump**: Paste your messy thoughts. AI turns them into organized tasks.
- **Focus Mode**: Pomodoro timer built in. Lock in and get it done.
- **Floating Timer**: Draggable widget that stays with you while you work.
- **Google Calendar Sync**: Two-way sync with your calendar. Tasks become events.
- **Recurring Tasks**: Daily, weekly, monthly. Set it and forget it.
- **Projects**: Group tasks. Stay organized. Or don't. We're not judging.
- **Stats**: See your productivity trends. Flex on yourself.
- **Works Everywhere**: Web, mobile, offline. Your tasks follow you.

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
3. Run the database migrations in Supabase
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

# Optional: For AI Brain Dump feature
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: For Google Calendar integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

> **Note**: The Brain Dump feature works without an API key using a fallback parser, but works much better with Claude AI.

> **Google Calendar**: Create a project in [Google Cloud Console](https://console.cloud.google.com), enable Calendar API, and create OAuth credentials. Add `{APP_URL}/api/integrations/google/callback` as authorized redirect URI.

## Brand

- **Name**: Bruh
- **Domain**: getbruh.app
- **Tagline**: "Get your shit together."
- **Colors**: Black (#0a0a0a) + Orange (#ff6b00)
- **Fonts**: Inter, Space Grotesk, JetBrains Mono

## License

MIT
