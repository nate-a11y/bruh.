import Link from "next/link";
import { Zap, Timer, Repeat, FolderKanban, BarChart3, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

const features = [
  {
    icon: Zap,
    title: "Fast af",
    description: "Add tasks in seconds. No friction. No forms. Just type and go.",
  },
  {
    icon: Timer,
    title: "Focus mode",
    description: "Pomodoro timer built in. Lock in and get it done.",
  },
  {
    icon: Repeat,
    title: "Recurring tasks",
    description: "Daily, weekly, monthly. Set it and forget it.",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    description: "Group tasks. Stay organized. Or don't. We're not judging.",
  },
  {
    icon: BarChart3,
    title: "Stats",
    description: "See your productivity trends. Flex on yourself.",
  },
  {
    icon: Smartphone,
    title: "Works everywhere",
    description: "Web, mobile, offline. Your tasks follow you.",
  },
];

export default function LandingPage() {
  // Note: Logged-in users are redirected to /today by middleware
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Log in
          </Link>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
        <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6">
          Get your shit
          <br />
          <span className="text-primary">together.</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-lg mx-auto mb-10">
          A task manager that doesn&apos;t take itself too seriously. But takes your
          productivity very seriously.
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
          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
            For people who have too much to do
          </p>
          {/* App screenshot mockup */}
          <div className="relative mx-auto max-w-3xl">
            <div className="bg-card rounded-xl border border-border p-4 shadow-2xl">
              {/* Placeholder for app screenshot */}
              <div className="aspect-video bg-surface-elevated rounded-lg" />
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-display font-bold text-foreground text-center mb-16">
          Everything you need. Nothing you don&apos;t.
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="p-6 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl font-display font-bold text-foreground mb-4">Ready?</h2>
        <p className="text-muted-foreground mb-8">
          Free forever. No credit card. No excuses.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup">Let&apos;s go</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Bruh. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
