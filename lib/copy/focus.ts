export const focusMessages = {
  start: [
    "Lock in.",
    "Focus mode. No distractions.",
    "Time to work.",
  ],
  halfway: [
    "Halfway there.",
    "Keep going.",
    "Solid progress.",
  ],
  almostDone: [
    "Almost there.",
    "Final stretch.",
    "Finish strong.",
  ],
  complete: [
    "Session complete. Nice.",
    "Time's up. Good work.",
    "Done. Take a break.",
  ],
  breakStart: [
    "Break time. Step away.",
    "Rest. You earned it.",
    "Take 5. Or 15. Whatever.",
  ],
} as const;

export type FocusMessageType = keyof typeof focusMessages;

export const getFocusMessage = (type: FocusMessageType): string => {
  const options = focusMessages[type];
  return options[Math.floor(Math.random() * options.length)];
};
