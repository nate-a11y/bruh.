// Social proof section for the marketing site.
//
// IMPORTANT: the quotes AND names below are PLACEHOLDERS with representative
// names, standing in until real testimonials come in. Replace them with real
// reviews (with the person's permission) as soon as you have them. See
// docs/LAUNCH.md.

const testimonials = [
  {
    quote:
      "I brain-dumped six months of mental clutter in one sitting and it just sorted itself into tasks. I actually did three of them that day.",
    name: "Maya R.",
    detail: "ADHD, freelance designer",
  },
  {
    quote:
      "The “what now?” button is the only thing that gets me unstuck. It picks one thing and starts a timer before I can talk myself out of it.",
    name: "Devon K.",
    detail: "diagnosed at 34",
  },
  {
    quote:
      "No red overdue walls screaming at me. I missed two days, came back, and nothing guilt-tripped me. That's why I keep opening it.",
    name: "Priya S.",
    detail: "grad student",
  },
  {
    quote:
      "Every other app made me build a system first. bruh. just worked the second I opened it. Setup fatigue was the reason I quit the others.",
    name: "Marcus T.",
    detail: "software engineer",
  },
  {
    quote:
      "Focus mode makes time visible. Time blindness is my whole life and watching the timer actually keeps me in the chair.",
    name: "Jules B.",
    detail: "parent of two, ADHD",
  },
  {
    quote:
      "It broke a project I'd been avoiding for weeks into five tiny steps. Suddenly it wasn't scary, it was just a list.",
    name: "Sam W.",
    detail: "recovering Notion power-user",
  },
];

export function Testimonials() {
  return (
    <section className="bg-muted/30 py-20">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-3">
          Brains that finally get along with their to-do list
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          What people are saying about focusing with bruh.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <figure key={i} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <blockquote className="text-sm text-foreground/90 flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-xs">
                <span className="font-medium text-foreground">{t.name}</span>
                <span className="text-muted-foreground"> · {t.detail}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
