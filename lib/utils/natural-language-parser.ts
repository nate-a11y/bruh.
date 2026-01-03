import {
  parse,
  addDays,
  addWeeks,
  addMonths,
  nextMonday,
  nextFriday,
  setHours,
  setMinutes,
  format,
} from "date-fns";

export interface ParsedTaskInput {
  title: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority?: "low" | "normal" | "high" | "urgent";
  tags?: string[];
  estimatedMinutes?: number;
  listName?: string;
}

// Date patterns
const DATE_PATTERNS: { pattern: RegExp; handler: () => Date }[] = [
  { pattern: /\btoday\b/i, handler: () => new Date() },
  { pattern: /\btomorrow\b/i, handler: () => addDays(new Date(), 1) },
  { pattern: /\byesterday\b/i, handler: () => addDays(new Date(), -1) },
  { pattern: /\bnext week\b/i, handler: () => addWeeks(new Date(), 1) },
  { pattern: /\bnext month\b/i, handler: () => addMonths(new Date(), 1) },
  { pattern: /\bmonday\b/i, handler: () => nextMonday(new Date()) },
  { pattern: /\bfriday\b/i, handler: () => nextFriday(new Date()) },
  { pattern: /\bin (\d+) days?\b/i, handler: () => new Date() }, // Handled separately
  { pattern: /\bin (\d+) weeks?\b/i, handler: () => new Date() }, // Handled separately
];

// Time patterns
const TIME_PATTERNS = [
  /\bat (\d{1,2}):(\d{2})\s*(am|pm)?\b/i,
  /\bat (\d{1,2})\s*(am|pm)\b/i,
  /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i,
];

// Priority patterns
const PRIORITY_PATTERNS: { pattern: RegExp; priority: ParsedTaskInput["priority"] }[] = [
  { pattern: /!urgent|!u|!!!/i, priority: "urgent" },
  { pattern: /!high|!h|!!/i, priority: "high" },
  { pattern: /!low|!l/i, priority: "low" },
  { pattern: /!normal|!n|!/i, priority: "normal" },
  { pattern: /\bp1\b/i, priority: "urgent" },
  { pattern: /\bp2\b/i, priority: "high" },
  { pattern: /\bp3\b/i, priority: "normal" },
  { pattern: /\bp4\b/i, priority: "low" },
];

// Time estimate patterns
const ESTIMATE_PATTERNS = [
  /\b(\d+)\s*(?:min|mins|minutes?)\b/i,
  /\b(\d+)\s*(?:hr|hrs|hours?)\b/i,
  /\b~(\d+)m\b/i,
  /\b~(\d+)h\b/i,
];

export function parseNaturalLanguageTask(input: string): ParsedTaskInput {
  let text = input.trim();
  const result: ParsedTaskInput = { title: "" };

  // Extract tags (#tag)
  const tagMatches = text.match(/#(\w+)/g);
  if (tagMatches) {
    result.tags = tagMatches.map((t) => t.slice(1));
    text = text.replace(/#\w+/g, "").trim();
  }

  // Extract list (@list)
  const listMatch = text.match(/@(\w+)/);
  if (listMatch) {
    result.listName = listMatch[1];
    text = text.replace(/@\w+/, "").trim();
  }

  // Extract priority
  for (const { pattern, priority } of PRIORITY_PATTERNS) {
    if (pattern.test(text)) {
      result.priority = priority;
      text = text.replace(pattern, "").trim();
      break;
    }
  }

  // Extract time estimate
  for (const pattern of ESTIMATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let minutes = parseInt(match[1]);
      // Check if it's hours
      if (/hr|hour|h\b/i.test(match[0])) {
        minutes *= 60;
      }
      result.estimatedMinutes = minutes;
      text = text.replace(pattern, "").trim();
      break;
    }
  }

  // Extract time
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const ampm = match[3] || match[2]; // Handle "at 3pm" format

      if (typeof ampm === "string" && /pm/i.test(ampm) && hours < 12) {
        hours += 12;
      } else if (typeof ampm === "string" && /am/i.test(ampm) && hours === 12) {
        hours = 0;
      }

      result.dueTime = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
      text = text.replace(pattern, "").trim();
      break;
    }
  }

  // Extract date
  // Check "in X days/weeks"
  const inDaysMatch = text.match(/\bin (\d+) days?\b/i);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1]);
    result.dueDate = format(addDays(new Date(), days), "yyyy-MM-dd");
    text = text.replace(inDaysMatch[0], "").trim();
  }

  const inWeeksMatch = text.match(/\bin (\d+) weeks?\b/i);
  if (inWeeksMatch) {
    const weeks = parseInt(inWeeksMatch[1]);
    result.dueDate = format(addWeeks(new Date(), weeks), "yyyy-MM-dd");
    text = text.replace(inWeeksMatch[0], "").trim();
  }

  // Check standard date patterns
  if (!result.dueDate) {
    for (const { pattern, handler } of DATE_PATTERNS) {
      if (pattern.test(text)) {
        result.dueDate = format(handler(), "yyyy-MM-dd");
        text = text.replace(pattern, "").trim();
        break;
      }
    }
  }

  // Check for explicit date formats
  if (!result.dueDate) {
    // MM/DD or MM-DD
    const shortDateMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
    if (shortDateMatch) {
      const month = parseInt(shortDateMatch[1]);
      const day = parseInt(shortDateMatch[2]);
      const year = new Date().getFullYear();
      const date = new Date(year, month - 1, day);
      // If date is in the past, assume next year
      if (date < new Date()) {
        date.setFullYear(year + 1);
      }
      result.dueDate = format(date, "yyyy-MM-dd");
      text = text.replace(shortDateMatch[0], "").trim();
    }
  }

  // Clean up extra spaces and set title
  result.title = text.replace(/\s+/g, " ").trim();

  // Remove leading/trailing punctuation from title
  result.title = result.title.replace(/^[,\s]+|[,\s]+$/g, "");

  return result;
}

// Helper to check if input looks like it has natural language elements
export function hasNaturalLanguageElements(input: string): boolean {
  const patterns = [
    /\btoday\b/i,
    /\btomorrow\b/i,
    /\bnext\b/i,
    /\bmonday|tuesday|wednesday|thursday|friday|saturday|sunday\b/i,
    /\bat \d/i,
    /!+[a-z]?/i,
    /#\w+/,
    /@\w+/,
    /~\d+[mh]/i,
    /\bin \d+ (days?|weeks?)\b/i,
    /\bp[1-4]\b/i,
  ];

  return patterns.some((p) => p.test(input));
}
