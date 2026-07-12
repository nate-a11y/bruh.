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

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions), React 19
- **Database**: Supabase (Postgres with RLS)
- **Auth**: Supabase Auth (email/password + magic link)
- **Billing**: Stripe (subscriptions + webhooks)
- **Email**: Resend (transactional email, invites, digests, inbound task-by-email)
- **AI**: Anthropic Claude (Brain Dump parsing, with a local fallback parser)
- **Integrations**: Google Calendar, Notion, Slack (OAuth)
- **Rate limiting**: Upstash Redis
- **Jobs**: Vercel Cron (recurring tasks, scheduled digests)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State**: Zustand for timer state
- **Animations**: Framer Motion

## Getting Started

Requires Node 22+ (see `.nvmrc`).

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your credentials
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

See [`.env.example`](./.env.example) for the full list with per-variable notes. Copy it to `.env.local` and fill in the values.

**Required**

```
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (database + auth)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cron (scheduled jobs)
CRON_SECRET=

# Stripe (billing)
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend (transactional email)
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

**Optional**

```
# Anthropic (AI Brain Dump)
ANTHROPIC_API_KEY=

# Google Calendar integration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Notion integration
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=

# Slack integration
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=

# Inbound email (task-by-email)
INBOUND_EMAIL_SECRET=

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
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
