import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { Check } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Pricing | bruh.",
  description: "bruh. is free forever. Go Pro for AI planning and integrations. Simple pricing, no bullshit.",
};

const plans = [
  { ...PLANS.free, cta: "Get started free", href: "/signup", highlight: false },
  { ...PLANS.pro, cta: `Start ${TRIAL_DAYS}-day free trial`, href: "/signup", highlight: true },
  { ...PLANS.team, cta: "Create a team", href: "/signup", highlight: false },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between p-6 max-w-5xl mx-auto">
        <Link href="/">
          <Logo size="md" showIcon={false} />
        </Link>
        <div className="flex items-center gap-4">
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

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Simple pricing. No bullshit.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            The whole app is free forever. Go Pro when you want the AI planner and integrations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 flex flex-col ${
                plan.highlight
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xl font-display font-bold text-foreground">{plan.name}</h2>
                  {plan.highlight && (
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">
                      Most popular
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground mb-1">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.tagline}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={plan.highlight ? "default" : "outline"}
                className="w-full"
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Cancel anytime. No credit card required for Free.
        </p>
      </main>

      <footer className="border-t border-border py-8 px-6 mt-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <Logo size="sm" showIcon={false} />
          <div className="flex items-center gap-6">
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
