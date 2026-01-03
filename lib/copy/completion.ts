export const completionMessages = {
  single: [
    "Handled.",
    "Done.",
    "Let's go.",
    "That's what I thought.",
    "One down.",
    "✓",
  ],
  streak: [
    "You're on one.",
    "Keep going.",
    "Momentum.",
    "Stack 'em up.",
  ],
  bigTask: [
    "LETS GOOO",
    "That was a big one. Respect.",
    "Huge. Absolutely huge.",
  ],
  lastOfDay: [
    "Day cleared. Go home.",
    "That's everything. Touch grass.",
    "All done. You earned it.",
  ],
} as const;

export type CompletionType = keyof typeof completionMessages;

export const getCompletionMessage = (type: CompletionType): string => {
  const options = completionMessages[type];
  return options[Math.floor(Math.random() * options.length)];
};
