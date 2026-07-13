import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "ADHD Task Manager & Focus App | bruh.",
  description:
    "The task manager built for ADHD and neurodivergent brains. Brain-dump the chaos, break task paralysis, and lock in with focus mode. No shame, no friction, no 47-step setup.",
  alternates: { canonical: "https://getbruh.app/for-adhd" },
  openGraph: {
    title: "The focus app for brains that won't cooperate | bruh.",
    description:
      "Built for ADHD: brain dump, task-paralysis breaker, and focus mode. Get your shit together — no shame.",
    url: "https://getbruh.app/for-adhd",
  },
};

const problems = [
  {
    pain: "Too many thoughts, can't start",
    fix: "Brain Dump",
    body: "Word-vomit everything on your mind. AI sorts it into clear, doable tasks so you don't have to.",
  },
  {
    pain: "Don't know what to do next",
    fix: "“What now?”",
    body: "One tap picks the single next thing to do and starts the timer. Executive dysfunction, meet your off-switch.",
  },
  {
    pain: "Time blindness",
    fix: "Focus mode",
    body: "A visual Pomodoro timer with ambient sound that follows you around the screen. See time pass instead of losing it.",
  },
  {
    pain: "Everything feels huge",
    fix: "Auto-breakdown",
    body: "AI splits scary multi-step projects into small, sequential steps you can actually finish.",
  },
  {
    pain: "Shame spirals",
    fix: "Zero judgment",
    body: "No streak guilt-trips, no red overdue walls screaming at you. Miss a day? Bruh. We move on.",
  },
  {
    pain: "Setup fatigue",
    fix: "Zero friction",
    body: "Type and go. No projects to configure, no 47 fields per task. It works the second you open it.",
  },
];

export default function ForAdhdPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto">
        <Link href="/">
          <Logo size="md" showIcon={false} />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition">
            Pricing
          </Link>
          <Button asChild>
            <Link href="/signup">Get started free</Link>
          </Button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <p className="text-sm font-medium text-primary uppercase tracking-wide mb-4">
          For ADHD &amp; neurodivergent brains
        </p>
        <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6">
          The focus app for brains
          <br />
          <span className="text-primary">that won&apos;t cooperate.</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-8">
          Every other task manager assumes you already have your act together. bruh. is
          built for the days you don&apos;t &mdash; task paralysis, time blindness, and all.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button size="lg" asChild>
            <Link href="/signup">Start for free</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Free forever. No credit card.</p>
      </main>

      <section className="bg-muted/30 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-12">
            Built around how ADHD actually works
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((p) => (
              <div key={p.pain} className="rounded-2xl border border-border bg-card p-6">
                <p className="text-xs text-muted-foreground line-through mb-1">{p.pain}</p>
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {p.fix}
                </h3>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
          Your brain isn&apos;t broken. Your app is.
        </h2>
        <p className="text-muted-foreground mb-8">
          Give it five minutes. Worst case, you brain-dump the noise and feel a little lighter.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup">Get your shit together</Link>
        </Button>
      </section>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <Logo size="sm" showIcon={false} />
          <div className="flex items-center gap-6">
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
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} bruh.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
