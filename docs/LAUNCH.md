# bruh. Launch Playbook

The go-to-market checklist for launching bruh. (getbruh.app), the ADHD-first
task manager. Positioning: the focus app for brains that won't cooperate. No
shame, no friction, no 47-step setup.

## Positioning cheatsheet

- One-liner: "The task manager built for ADHD brains. Brain-dump the chaos, break task paralysis, lock in."
- Audience: ADHD / neurodivergent adults, and anyone who bounces off Notion/Todoist because setup is a chore.
- Wedge features: Brain Dump (AI sorts your mental clutter into tasks), "What now?" (breaks task paralysis), Focus mode (visual Pomodoro), Auto-breakdown.
- Tone: warm, direct, a little irreverent. Never guilt-trippy. "Miss a day? Bruh. We move on."
- Pricing: free forever + 30-day Pro trial, Pro at $19.99/mo, Teams at $19.99 base + $12/additional seat.

## Product Hunt launch

### Pre-launch (2-3 weeks out)
- [ ] Create/claim the PH profile; warm up by engaging genuinely for a couple weeks (comment on other launches).
- [ ] Line up a hunter with reach (optional; self-hunting is fine now).
- [ ] Build a small "launch squad" list (friends, ADHD communities, early users) to notify on launch morning. Do NOT ask for upvotes explicitly (against PH rules) — ask them to "check it out and leave honest feedback."
- [ ] Prepare all assets below.
- [ ] Pick the date: launch 12:01am PT, ideally Tue-Thu. Avoid holidays and big-name launch days if you can see them coming.

### Assets needed
- [ ] **Thumbnail/logo**: 240x240 PNG, the bruh. mark on a solid dark background.
- [ ] **Gallery images (1270x760)**, 4-6 of them, in order:
  1. Hero: the brain-dump turning chaos into a clean task list.
  2. "What now?" breaking task paralysis (single next action + timer).
  3. Focus mode: the visual Pomodoro timer.
  4. Auto-breakdown: a scary project split into small steps.
  5. Mobile view (installable PWA).
  6. Pricing/"free forever" reassurance.
- [ ] **Demo video (optional, <=60s)**: screen-recorded, no voiceover needed, captions on. Show a real brain-dump to done.
- [ ] **Tagline (60 char max)**: e.g. "The focus app for brains that won't cooperate."
- [ ] **Description**: 2-3 sentences, lead with the ADHD wedge.

### Taglines to A/B consider
- "The focus app for brains that won't cooperate."
- "Brain-dump the chaos. Get your shit together."
- "The task manager built for ADHD, not against it."

### First comment (post as maker, immediately)
> Hey PH. I'm Nate. I built bruh. because every task manager I tried assumed I already had my act together, and on ADHD days I don't. So bruh. is built for the days you don't: brain-dump everything on your mind and AI sorts it into doable tasks, tap "what now?" when you're frozen and it picks the single next thing and starts a timer, and focus mode makes time visible so you stop losing it. No streak guilt, no red overdue walls. It's free forever, Pro adds the AI planner. Would love your honest feedback, especially from fellow ADHD brains.

### Launch day
- [ ] Post at 12:01am PT.
- [ ] Notify your launch squad (personal DMs > mass blast).
- [ ] Reply to every comment within minutes for the first few hours.
- [ ] Cross-post (see channels below) — but tailor each, don't copy-paste.
- [ ] Watch getbruh.app conversion in the owner dashboard (Admin > Overview): signups, trials, MRR.

## Distribution channels

### ADHD / neurodivergent communities (highest fit)
- [ ] r/ADHD, r/adhdwomen, r/ADHD_partners (read each sub's self-promo rules first; lead with value, not a pitch).
- [ ] ADHD TikTok / Instagram creators — offer free Pro for an honest review.
- [ ] ADHD Discord/Slack communities.
- [ ] Tiimo / Inflow adjacent audiences (comparison content).

### General
- [ ] Personal LinkedIn + X launch post (founder story angle: "I built the task app I needed").
- [ ] Indie Hackers launch post.
- [ ] Hacker News "Show HN" (only if you can be present to reply for hours).
- [ ] Relevant subreddits: r/productivity, r/getdisciplined (value-first).

## SEO / content (already shipped, keep feeding)
- [x] /for-adhd landing page (public), FAQ + schema, sitemap/robots.
- [ ] Blog posts targeting: "adhd task manager", "how to beat task paralysis", "adhd time blindness app", "brain dump app".
- [ ] Comparison pages: bruh vs Notion / Todoist / Tiimo / Sunsama for ADHD.

## Social proof plan
- [ ] Collect 5-10 real testimonials from trial users (in-app prompt or email after day 7). Swap the placeholder quotes in `components/marketing/testimonials.tsx` for real ones with names + permission.
- [ ] Add a "wall of love" once you have 15+ quotes.
- [ ] Screenshot positive tweets/reviews for the PH gallery and landing page.

## Referral loop (planned)
- A "give a month, get a month" referral: each user gets a shareable `getbruh.app/?ref=CODE` link; when a referred user subscribes, both get a free month (or a trial extension). Wire the reward through the existing coupon / trial-extension system. Not yet built — see the referral loop as the next growth feature.

## Metrics to watch (owner dashboard: Admin > Overview)
- Signups/week, trial -> paid conversion %, MRR, 7-day active users, churn.
- Dunning (past-due recovery) and disputes are auto-handled; just watch the counts.
