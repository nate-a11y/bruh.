export const overdueMessages = [
  "bruh.",
  "This ain't it.",
  "We need to talk.",
  "Overdue. Handle it.",
  "Past due. Not great.",
] as const;

export const warningMessages = {
  almostDue: [
    "Due soon. Heads up.",
    "Clock's ticking.",
    "This is due today.",
  ],
  manyOverdue: [
    "Multiple tasks overdue. bruh.",
    "You've got some catching up to do.",
    "Several things need attention.",
  ],
  streakRisk: [
    "Streak at risk. Don't break it.",
    "One task away from keeping the streak.",
    "Streak ends today unless...",
  ],
} as const;

export const getOverdueMessage = (): string => {
  return overdueMessages[Math.floor(Math.random() * overdueMessages.length)];
};

export type WarningType = keyof typeof warningMessages;

export const getWarningMessage = (type: WarningType): string => {
  const options = warningMessages[type];
  return options[Math.floor(Math.random() * options.length)];
};
