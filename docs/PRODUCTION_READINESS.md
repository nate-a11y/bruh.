# bruh. — Production Readiness Plan

> Audit + roadmap to take bruh. from "live but leaky & free" to a safe, chargeable, sellable self-serve SaaS. Generated from a 5-track audit (security/RLS, billing, correctness, product/UX, deploy/ops).

**App state today:** Live at getbruh.app (Next.js 16 / React 19 / Supabase / Stripe). Build passes, typecheck clean. But it currently **leaks user data, can't charge money, and gives every feature away for free.** Fixable — most of the plumbing exists; the gaps are enforcement, wiring, and hardening.

**Origin (so we don't re-derive it):** bruh. began as **"Zeroed," a focus app inspired by [Blitzit](https://blitzit.app)** — core loop: tasks with time estimates → focus countdown → actual-vs-estimated tracking → analytics; "Zero in. Get it done."; Linear/Vercel aesthetic, electric indigo. Nine sprints later, Sprint 9 rebranded it to **bruh.** (black+orange, "Get your shit together," chaotic energy). The `zeroed_` table prefix is the fossil of the old name. Blitzit is beloved in ADHD circles for exactly that estimate→blitz loop — which is why the ADHD/neurodivergent positioning below is a *return to roots*, not a pivot.

---

## Status (2026-07-12)

**Phases 0–2 shipped & verified in prod. Phase 3 (correctness) + most of Phase 4 (polish) done in one batch (this PR).**
- **P0 security leaks** — fixed (0 RLS-off tables).
- **P1 billing** — freemium live; Stripe wired (product/price/webhook/portal); account activated.
- **P2 hardening** — RPC anon-revoke + `auth.uid()` guards, SSRF guard, inbound-email auth, Upstash rate limiting.
- **P3 correctness** — `awardPoints` now atomic (RPC) + error-checked; 16 silent mutation sites now handle errors; calendar click stubs wired to a task dialog.
- **P4 polish** — 74 `aria-label`s added (a11y C→up), OG image + `metadataBase`, `sitemap.ts`/`robots.ts`, security headers, `.env.example`, README fixed, `.nvmrc` + CI; Teams hidden behind a route guard.
- **S10** — invite-role validation, `signups_enabled` gate, Google webhook channel-token (+ `GOOGLE_WEBHOOK_TOKEN` set).

Remaining: owner sets Stripe statement descriptor to `GETBRUH.APP`; **Sentry** (needs a DSN from you); onboarding-flow wiring (product call: wire vs delete); the ADHD "level up" features (net-new builds). C4 React-19 lint signals + C6 migration-versioning are low-priority polish.

## The 3 things that make this urgent (RESOLVED)

1. **Live data leaks.** Two tables shipped with Row Level Security *disabled* (`zeroed_team_invitations`, `zeroed_email_logs`). With the public anon key, anyone can read every team's invite tokens + invited emails and every user's inbound-email metadata. This is exploitable **right now** in production.
2. **It cannot charge.** No Stripe env vars exist in Vercel (any environment). Checkout would fail. Even if wired, there is **zero server-side paywall enforcement** — the subscription check is called in exactly one place (the settings UI, display only) and **fails open** on any DB error. Every feature is free forever.
3. **The landing page is a bait-and-switch.** It promises "free, no credit card, no trial BS" then the app enforces a $19.99/mo wall. There's no pricing page. This kills trust at the exact conversion moment.

---

## Phase 0 — Stop the bleed (security, LIVE) 🔴

These are live vulnerabilities. All are SQL migrations against the production Supabase DB (needs your go-ahead to apply to prod).

- [x] **S1 — Enable RLS on `zeroed_team_invitations`** + policies (admins manage; invitee views/accepts own by email). ✅ applied to prod `20260712120000`, verified RLS on.
- [x] **S2 — Enable RLS on `zeroed_email_logs`** (owner-read; service-role writes bypass). ✅ applied + verified.
- [x] **S8 — RESOLVED (not a risk):** `zeroed_outgoing_webhooks`, `zeroed_api_keys`, `zeroed_webhook_logs` **do not exist** in prod (dead webhook/API-key feature). No leak; code references non-existent tables.
- [x] Verified against prod: exactly those 2 tables were RLS-off; both empty (nothing exposed yet); **0 RLS-off tables remain**.

## Phase 1 — Make it chargeable + honest 🟠

**Model chosen: freemium.** Core app is free forever (kills the bait-and-switch); Pro ($19.99/mo, 30-day trial) unlocks AI planning + integrations. Tier config is centralized in `lib/plans.ts` (`ENFORCED_PRO_FEATURES` + `PLANS`) — edit there to change the free/Pro line.

- [ ] **B1 — Wire Stripe in prod (NEEDS YOU):** create product + $19.99/mo recurring price, set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` in Vercel; register webhook `https://getbruh.app/api/stripe/webhook`. **This is the only remaining blocker to actually charge** — all code is ready.
- [x] **B2 — Server-side paywall enforcement.** ✅ Freemium gating via `requireProApi()` / `isPro()`: AI auto-schedule → 402, integration connects (Google/Notion/Slack) → redirect to `/pricing`. Core app stays free. (`lib/plans.ts`, `lib/subscriptions.ts`, gated routes.)
- [x] **B3 — Fail CLOSED.** ✅ `checkSubscriptionAccess` now returns `has_access:false` on DB error (`lib/subscriptions.ts`).
- [x] **B4 — Checkout handler provisions.** ✅ `handleCheckoutCompleted` now upserts status=active + subscription/customer id, matched by user id (falls back to customer id); checkout session now carries top-level `metadata.supabase_user_id`.
- [x] **B5 — Webhook idempotency.** ✅ `zeroed_stripe_events` dedup table + insert-guard in the webhook (dup → ack & skip). Migration `20260712120200`.
- [x] **B6 — `past_due` grace capped** at 7 days past period end (was unbounded). Migration `20260712120200`, verified.
- [ ] **B7 — Create the trial subscription row on signup** (trigger) instead of lazily. *(nicety, not blocking — RPC lazily creates it on first check)*
- [x] **UX1 — `/pricing` built** (free-vs-Pro, driven by `lib/plans.ts`) + linked from nav/CTA/footer.
- [x] **UX2 — Landing copy fixed** — honest free-forever + Pro-from-$19.99 messaging, links to `/pricing`.
- [ ] **UX3 (nicety)** — client-side handling of the 402 from gated AI actions (show an upgrade toast/modal instead of a silent fail).

## Phase 2 — Security hardening 🟠

- [x] **S3 — SECURITY DEFINER RPC lockdown (complete).** ✅ Revoked EXECUTE from `anon`+`public` on all 9 (`20260712120100`). ✅ Added `auth.uid()` guards on the 5 `p_user_id` RPCs (`add_points`, `aggregate_weekly_stats`, `check_achievements`, `increment_daily_stat`, `redeem_coupon`) — authenticated users can no longer act on another user's id; service-role calls unaffected (`20260712120300`, verified).
- [x] **S4 — RESOLVED (not live):** the `is_admin` column **doesn't exist** in prod, so the escalation path can't fire. Still worth fixing the code to use the `lib/admin.ts` email allowlist consistently (latent bug), but not a live risk.
- [x] **S5 — SSRF guard added** (`lib/webhooks/index.ts`) — `assertSafeWebhookUrl` blocks private/loopback/link-local/CGNAT IPs (incl. `169.254.169.254`) + non-http(s) schemes, resolves DNS, and the fetch uses `redirect: "error"`. (Feature's tables don't exist in prod; this is defense-in-depth.)
- [x] **S6 — Inbound-email endpoint authenticated** (`app/api/email/inbound/route.ts`) — requires `INBOUND_EMAIL_SECRET` via `?secret=` or `x-inbound-secret` header (constant-time compare), **fails closed**. ⚠️ Set `INBOUND_EMAIL_SECRET` in Vercel + include it in the provider's inbound webhook URL before enabling email-to-task.
- [x] **S7 — Template policies fixed.** ✅ Split `FOR ALL` into public-read SELECT + owner-only INSERT/UPDATE/DELETE on both template tables; applied `20260712120100`, verified.
- [x] **S9 — Rate limiting** via Upstash Redis (`lib/rate-limit.ts`, sliding window, fails open if Redis down). Gated: login/signup (10/min/IP), inbound email (30/min/IP), AI auto-schedule (20/min/user). Upstash DB provisioned via management API; creds in Vercel prod. Stripe webhook left ungated (already signature-verified; avoid throttling Stripe).
- [ ] **S10 (P2)** — Google Calendar webhook channel-token verification; encrypt OAuth tokens at rest; signup should honor `signups_enabled` + throttle + not auto-confirm email; validate team-invite role from body.

## Phase 3 — Correctness / reliability 🟡

- [ ] **C1 — `awardPoints` lost-update race** (`app/(dashboard)/actions.ts:1607`) — move the increment into an atomic Postgres RPC; check the `error`.
- [ ] **C2 — ~50+ Supabase mutations ignore their `error` field** → silent false-success (UI shows saved, data diverges). Systematic error-checking pass on `actions.ts`. This is the pattern the project's own CLAUDE.md warns against.
- [ ] **C3 — Calendar task/slot clicks are stubbed to `console.log`** (`app/(dashboard)/calendar/page.tsx:77`) — wire them or the calendar page is dead.
- [ ] **C4 — Reconcile the ~23 real React-19 lint signals** (`set-state-in-effect`, `purity`, `exhaustive-deps`) — the genuine bugs hiding in the 217 lint problems (the other ~90% are cosmetic `any`/unused).
- [ ] **C5 — Focus-session double-count effect** (`components/focus/focus-timer.tsx:139`) + `Date.now()` in render (`shutdown-flow.tsx:48`).
- [ ] **C6 — Fix duplicate-versioned migrations** (three files share `20260103`, four share `20260104`) — breaks `supabase db push`. Rename to unique timestamps + link the project.

## Phase 4 — Launch quality (polish, ops, trust) 🟢

- [ ] **Observability:** add Sentry (`@sentry/nextjs`), structured logging. Right now cron/webhook errors vanish into Vercel logs.
- [ ] **Accessibility (nate-a11y repo — this should be a point of pride):** 65 icon-only buttons, **1** `aria-label`. Add labels/`sr-only` to every icon control; fix `muted-foreground` contrast; add skip-link + focus-ring. Target A11y grade C → A.
- [ ] **SEO/social:** OG image (you already have `BruhSS.jpg`), `metadataBase`, `sitemap.ts`, `robots.ts`.
- [ ] **Onboarding:** the built 4-step `onboarding-flow.tsx` is dead code — wire it (drives activation) or delete it. Today new users get one name prompt → empty dashboard.
- [ ] **Reduce launch surface:** hide the half-built **Teams/Projects** area (`as any` throughout, unregenerated types) and tuck voice/webhooks/inbound-email behind an "Advanced" area until hardened.
- [ ] **Lint cleanup:** clear the ~194 cosmetic `any`/unused problems once the real signals (C4) are handled.
- [ ] **Config/headers:** `next.config.ts` is empty — add security headers (CSP, HSTS, X-Frame-Options), image `remotePatterns`.
- [ ] **Housekeeping:** create `.env.local.example` (full inventory below), fix README ("Next 14+" → 16; missing env file), remove dead `inngest` dependency (keys set but no route/functions), pin Node (`.nvmrc` + `engines`), add minimal CI (lint + build), schedule the orphan `daily-summary` cron (or confirm Pro plan for the `*/15` reminder cron).

---

## Level it up — product ideas 🚀

Grounded in what bruh. already is (chaotic-energy productivity: AI brain dump + focus mode + tasks), and doubling as the **free-vs-Pro split** that fixes monetization. Star = high impact / on-brand.

### ⭐⭐ The wedge: position bruh. for ADHD / neurodivergent brains

This is the strongest strategic move available and it fits the existing product almost perfectly. bruh. already ships the primitives the leading ADHD focus apps are built on — it just hasn't *named the audience* or connected the pieces with AI. The anti-corporate, non-judgmental, low-friction, "we're not judging" brand is precisely why ADHD users bounce off Todoist/Asana and love tools like Tiimo. Specific ICP, high need, underserved, pays.

**bruh. already has ~70% of the pieces:**

| What ADHD apps do | Their example | bruh. already has | Gap to close |
|---|---|---|---|
| AI auto-scheduling + daily planning ritual, per-task time/Pomodoro estimates | Sunsama | Calendar sync, `/api/tasks/auto-schedule`, `/planning` page, `/shutdown` ritual | Wire a real "plan my day" ritual; add time/Pomodoro-block estimates per task |
| "Ask the AI what to do next," break tasks into sequential sessions | Mindory ("Mindy") | AI brain dump, `lib/ai/breakdown-task.ts` | A conversational "what's next?" + task→micro-sessions flow |
| AI suggests work/break intervals from *your* energy & peak-productivity data | AI Pomodoro Focus&Study | Focus mode + focus-session logging in DB | Adaptive Pomodoro that learns from the user's own session history |
| Highly visual planner, AI breaks multi-step projects into simple steps | Tiimo | `/timeline` visual view | Visual "now / next / later" mode; AI project→steps (already have breakdown) |

**The features that turn primitives into the ADHD wedge (all Pro-worthy):**
- ⭐ **Task-paralysis breaker** — one button: "I don't know where to start." AI picks the single next 5-minute action and starts a timer. Directly targets executive-dysfunction freeze.
- ⭐ **AI "plan my day" ritual** — arranges today's tasks into time blocks around your real calendar, with per-task Pomodoro estimates; a gentle daily-open habit (the Sunsama loop).
- ⭐ **Adaptive Pomodoro** — work/break lengths tuned to *your* logged focus data, not a fixed 25/5. "You focus best in 18-min bursts before 11am."
- **"What's next?" AI** — ask, get one thing, not a wall of tasks. Reduces overwhelm.
- **Visual now/next/later timeline** + time-blindness aids (visual countdowns, elapsed-time cues) — Tiimo's signature.
- **Body-doubling / co-focus rooms** — shared focus sessions (ties into Teams if kept).
- **Gentle, not shaming** — keep the "Roast me" idea strictly opt-in and playful; default tone is supportive. Rejection-sensitive users are the audience — shame-based nagging is a churn bomb, not a feature.

**Positioning shift:** "A task manager that doesn't take itself too seriously" → *"The focus app for brains that won't cooperate. Get your shit together — no shame, no friction, no 47-step setup."* Lean the landing page, pricing, and onboarding into ADHD/neurodivergent focus. It sharpens the vague "task manager" story into something a specific person will pay for on sight.



### Monetization-shaped tiering (do this alongside Phase 1)
The cleanest fix for "everything's free" is a real free/Pro line, not a hard wall:
- **Free:** core tasks/lists/today, basic focus timer, limited AI brain dumps (e.g. 5/mo), 1 project.
- **Pro ($19.99/mo):** unlimited AI, integrations (Google/Notion/Slack), advanced focus (PiP + audio), stats history, recurring tasks, priority. This makes the AI + focus features the reason to pay.

### AI-forward (the differentiator, 2026-native)
- ⭐ **"Roast me" mode** — AI reviews your procrastination/overdue pile and roasts you into action. Perfectly on-brand ("unhinged energy"), inherently shareable = viral loop. Pro feature.
- ⭐ **AI "plan my day"** — one tap arranges tasks into time blocks around your real calendar (auto-schedule endpoint already half-exists), energy-aware ordering. Killer daily-open habit.
- **Conversational task agent** — "what should I do right now?" / "clear my afternoon" chat that reads and mutates your list.
- **Weekly AI review** — "here's how your week went, here's the one thing to change." Drives the Sunday-planning ritual + retention email.
- **Smart reschedule / nag** — "you've pushed this 4×. Break it down or kill it?" AI-assisted.

### Growth loops
- ⭐ **Shareable "flex" cards** — your streak/stats as a share image (brand literally says "flex on yourself"). Free organic acquisition. Pairs with the "Roast me" screenshots.
- **Referral program** — give a Pro month, get a Pro month.
- **Public share pages** — share a list/goal/template read-only.
- **Community template gallery** — you already have a templates table; let users publish/discover.

### Capture everywhere (retention)
- ⭐ **Web push notifications** for reminders (today it's email + cron only) — table-stakes for a task app; big retention lever on the PWA.
- **Polish the existing surfaces:** browser extension (exists), Raycast (token endpoint exists), voice brain-dump (experimental), email-to-task (exists) — each is a capture funnel; pick 1–2 and make them great.
- **Bulletproof offline** — `idb` is already in; make offline-first reliable so tasks never get lost.

### Focus mode (already your strongest, lean in)
- Session goals + "what did you get done?" reflection → feeds stats and the weekly review.
- Ambient scenes / soundscapes as a Pro upsell; body-doubling / co-focus rooms (ties to Teams if you keep it).

---

## Complete env var inventory (for `.env.local.example`)

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, **`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`** (missing in prod), `RESEND_API_KEY`.
Optional: `RESEND_FROM_EMAIL`, `ANTHROPIC_API_KEY` (Brain Dump; has fallback), `GOOGLE_CLIENT_ID/SECRET`, `NOTION_CLIENT_ID/SECRET`, `SLACK_CLIENT_ID/SECRET/SIGNING_SECRET`.
Already set in Vercel prod today: everything **except the three Stripe vars**. That's the one live gap for billing.

---

## Suggested execution order

1. **Phase 0** (security leaks — hours, needs prod-DB go-ahead)
2. **Phase 1** (chargeable + honest — the business case)
3. **Phase 2** (security hardening)
4. **Phase 3** (correctness)
5. **Phase 4** (polish/ops) — interleave the ⭐ product ideas as their own mini-projects once the foundation is safe.
