export const streakMessages = {
  maintained: [
    "Consistency looks good on you.",
    "Streak intact. Keep it up.",
    "Another day, another W.",
  ],
  broken: [
    "Streak broken. It happens.",
    "Start again. That's all you can do.",
    "Reset. Go again.",
  ],
  milestone: {
    7: "Week streak. Solid.",
    14: "Two weeks. You're different.",
    30: "Month streak. Certified consistent.",
    60: "60 days. What are you, a machine?",
    90: "90 days. This is your personality now.",
    100: "100 DAYS. LEGENDARY.",
    365: "One year. You absolute psychopath.",
  },
} as const;

export const getStreakMessage = (type: 'maintained' | 'broken'): string => {
  const options = streakMessages[type];
  return options[Math.floor(Math.random() * options.length)];
};

export const getMilestoneMessage = (days: number): string | null => {
  const milestones = Object.keys(streakMessages.milestone)
    .map(Number)
    .sort((a, b) => b - a);

  for (const milestone of milestones) {
    if (days >= milestone) {
      return streakMessages.milestone[milestone as keyof typeof streakMessages.milestone];
    }
  }

  return null;
};
