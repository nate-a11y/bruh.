export const emptyStates = {
  inbox: [
    "Nothing here. Suspicious.",
    "Inbox zero. Touch grass.",
    "Empty. Either you're crushing it or lying to yourself.",
  ],
  today: [
    "No tasks today. Sure about that?",
    "Today is empty. That's either freedom or denial.",
    "Nothing due today. Enjoy it while it lasts.",
  ],
  completed: [
    "No completed tasks yet. We believe in you.",
    "Completed list is empty. Time to change that.",
    "Nothing done yet. Day's not over.",
  ],
  search: [
    "No results. Try something else.",
    "Couldn't find that. It's hiding.",
    "Nothing matches. Maybe it doesn't exist.",
  ],
  project: [
    "This project is empty. Fill it with regret.",
    "No tasks yet. The calm before the storm.",
    "Empty project energy. Add something.",
  ],
} as const;

export type EmptyStateType = keyof typeof emptyStates;

export const getEmptyState = (type: EmptyStateType): string => {
  const options = emptyStates[type];
  return options[Math.floor(Math.random() * options.length)];
};
