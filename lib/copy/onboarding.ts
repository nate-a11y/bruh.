export const onboardingCopy = {
  welcome: {
    title: "bruh.",
    subtitle: "Let's get your shit together.",
  },
  steps: [
    {
      title: "Add tasks",
      description: "Brain dump everything. We'll sort it out.",
    },
    {
      title: "Set due dates",
      description: "Or don't. We're not your mom.",
    },
    {
      title: "Get it done",
      description: "Check things off. Feel good. Repeat.",
    },
  ],
  complete: {
    title: "You're in.",
    description: "No more excuses. Let's go.",
  },
} as const;

export type OnboardingStep = (typeof onboardingCopy.steps)[number];
