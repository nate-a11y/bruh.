import Link from "next/link";
import { Target, Timer, CheckCircle2, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  // Note: Logged-in users are redirected to /today by middleware
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">Zeroed</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Zero in.{" "}
            <span className="text-primary">Get it done.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A productivity app that helps you focus on what matters. Track tasks,
            manage your time with focus sessions, and see your progress.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8">
                Start for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-12 px-8">
                Sign in
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg border border-border bg-card">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Task Management</h3>
              <p className="text-muted-foreground">
                Organize tasks in lists, set priorities, and track time estimates.
              </p>
            </div>
            <div className="text-center p-6 rounded-lg border border-border bg-card">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Timer className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Focus Timer</h3>
              <p className="text-muted-foreground">
                Pomodoro-style focus sessions to help you concentrate and get things done.
              </p>
            </div>
            <div className="text-center p-6 rounded-lg border border-border bg-card">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Analytics</h3>
              <p className="text-muted-foreground">
                Track your productivity with insights on completed tasks and focus time.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="bg-card border border-border rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to get focused?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of productive people using Zeroed.
            </p>
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8">
                Create Free Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Zeroed. Zero in. Get it done.</p>
        </div>
      </footer>
    </div>
  );
}
