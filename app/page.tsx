import Link from "next/link";
import Image from "next/image";
import {
  Zap,
  Timer,
  Repeat,
  FolderKanban,
  BarChart3,
  Smartphone,
  Brain,
  Mic,
  Calendar,
  Sparkles,
  Target,
  Webhook,
  Sun,
  Moon,
  LayoutGrid,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";

const coreFeatures = [
  {
    icon: Zap,
    title: "Fast af",
    description: "Add tasks in seconds. Natural language parsing understands 'Call mom tomorrow at 3pm !high'",
  },
  {
    icon: Timer,
    title: "Focus mode",
    description: "Pomodoro timer with ambient sounds. Lock in with rain, café, or lo-fi beats.",
  },
  {
    icon: Calendar,
    title: "Day / Week / Month",
    description: "Multiple calendar views. Plan your day, week, or month like a pro.",
  },
  {
    icon: Brain,
    title: "AI Brain Dump",
    description: "Dump your chaos. Claude AI extracts actionable tasks automatically.",
  },
  {
    icon: Sparkles,
    title: "AI Task Breakdown",
    description: "'Break this down' instantly generates subtasks for complex tasks.",
  },
  {
    icon: Mic,
    title: "Voice Input",
    description: "Speak your tasks out loud. Hands-free capture, zero typing.",
  },
];

const moreFeatures = [
  {
    icon: Target,
    title: "Habits & Goals",
    description: "Track daily habits. Set goals. Build streaks.",
  },
  {
    icon: LayoutGrid,
    title: "Eisenhower Matrix",
    description: "Prioritize with the urgent/important matrix view.",
  },
  {
    icon: Sun,
    title: "Planning Rituals",
    description: "Morning planning. Evening review. Weekly reflection.",
  },
  {
    icon: ListChecks,
    title: "Smart Suggestions",
    description: "AI-powered productivity tips based on your patterns.",
  },
  {
    icon: Webhook,
    title: "Zapier & Make",
    description: "Connect to 5,000+ apps and automate the busywork.",
  },
  {
    icon: Smartphone,
    title: "Works Offline",
    description: "PWA support. Install on mobile. Works without internet.",
  },
];

const integrations = [
  { name: "Google Calendar", logo: "📅" },
  { name: "Slack", logo: "💬" },
  { name: "Notion", logo: "📝" },
  { name: "Zapier", logo: "⚡" },
  { name: "Make", logo: "🔧" },
];

const faqs = [
  {
    q: "What is bruh.?",
    a: "bruh. is an AI task manager and focus app. You brain-dump your thoughts, AI turns them into organized tasks, and a built-in Pomodoro focus timer helps you actually get them done. It's designed for people (especially ADHD/neurodivergent brains) who bounce off heavier tools like Todoist or Asana.",
  },
  {
    q: "Is bruh. free?",
    a: "Yes. The core app — unlimited tasks, lists, projects, AI Brain Dump, and focus mode — is free forever, no credit card. Pro ($19.99/mo) adds AI planning and integrations, and Team is $19.99 base plus $12/mo per additional member.",
  },
  {
    q: "How does bruh. help with ADHD?",
    a: "It's built around executive dysfunction: Brain Dump clears mental overwhelm, a 'what now?' picker beats task paralysis by choosing your next single action, a visual focus timer fights time blindness, and there's no shame-based streak guilt. Get your shit together without the friction.",
  },
  {
    q: "Does bruh. use AI?",
    a: "Yes — bruh. uses Claude to turn messy brain dumps into structured tasks, break big projects into steps, and plan your day. AI output is a suggestion you stay in control of.",
  },
  {
    q: "Does bruh. sync with my calendar?",
    a: "Yes. Pro includes two-way Google Calendar sync, plus Notion and Slack integrations.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your data is private and locked to your account, payments run securely through Stripe (we never see or store your card number), and we don't sell your data or run ad trackers. You can export or delete everything anytime.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel in one click from billing settings and keep access through the end of your billing period.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function LandingPage() {
  // Note: Logged-in users are redirected to /today by middleware
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto">
        <Logo size="md" showIcon={false} />
        <div className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Log in
          </Link>
          <Button asChild>
            <Link href="/signup">Get started free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
        <Badge variant="secondary" className="mb-6">
          <Sparkles className="h-3 w-3 mr-1" />
          Now with AI-powered task management
        </Badge>

        <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6">
          Get your shit
          <br />
          <span className="text-primary">together.</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-lg mx-auto mb-4">
          The productivity app that combines AI, beautiful design, and zero bullshit.
        </p>

        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-10">
          Daily / Weekly / Monthly views • AI brain dump • Focus timer with ambient sounds •
          Habits • Goals • Integrations with everything
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button size="lg" asChild>
            <Link href="/signup">Start for free</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="#features">See features</Link>
          </Button>
        </div>

        {/* App screenshot mockup */}
        <div className="mt-16">
          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
            For people who have too much to do
          </p>
          <div className="relative mx-auto max-w-3xl">
            <div className="bg-card rounded-xl border border-border p-4 shadow-2xl">
              <Image
                src="/BruhSS.jpg"
                alt="bruh. app screenshot"
                width={1200}
                height={675}
                className="rounded-lg"
                priority
              />
            </div>
          </div>
        </div>
      </main>

      {/* Core Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-3xl font-display font-bold text-foreground">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Built for people who actually want to get things done, not just organize them.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {coreFeatures.map((feature) => (
            <div key={feature.title} className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* More Features */}
      <section className="bg-muted/30 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">And more</Badge>
            <h2 className="text-3xl font-display font-bold text-foreground">
              But wait, there&apos;s more
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {moreFeatures.map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl bg-background border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Connects with everything
          </h2>
          <p className="text-muted-foreground">
            Sync calendars, get Slack notifications, or connect to 5,000+ apps with Zapier &amp; Make.
          </p>
        </div>

        <div className="flex items-center justify-center gap-8 flex-wrap">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted"
            >
              <span className="text-xl">{integration.logo}</span>
              <span className="font-medium">{integration.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-muted/30 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Why bruh.?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-6">
              <p className="text-4xl font-bold text-primary mb-2">$0</p>
              <p className="text-muted-foreground text-sm">
                Free forever. Core app, no card.{" "}
                <Link href="/pricing" className="text-primary hover:underline">
                  See Pro
                </Link>
              </p>
            </div>
            <div className="p-6">
              <p className="text-4xl font-bold text-primary mb-2">AI</p>
              <p className="text-muted-foreground text-sm">Claude-powered brain dump & breakdown</p>
            </div>
            <div className="p-6">
              <p className="text-4xl font-bold text-primary mb-2">All-in-one</p>
              <p className="text-muted-foreground text-sm">Tasks + Calendar + Habits + Focus</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-10">
          Questions?
        </h2>
        <div className="divide-y divide-border">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none font-medium text-foreground flex items-center justify-between">
                {f.q}
                <span className="text-primary transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl font-display font-bold text-foreground mb-4">Ready?</h2>
        <p className="text-muted-foreground mb-8">
          Free forever. Go Pro for AI planning &amp; integrations &mdash; $19.99/mo with a 30-day trial.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/signup">Let&apos;s go</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <Logo size="sm" showIcon={false} />
          <div className="flex items-center gap-6">
            <Link href="/for-adhd" className="text-xs text-muted-foreground hover:text-foreground">
              For ADHD
            </Link>
            <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link href="/cookies" className="text-xs text-muted-foreground hover:text-foreground">
              Cookies
            </Link>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} bruh.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
