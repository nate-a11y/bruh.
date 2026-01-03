import Anthropic from "@anthropic-ai/sdk";

export interface ParsedTask {
  title: string;
  notes?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  due_date?: string; // ISO date string
  estimated_minutes?: number;
  subtasks?: string[];
}

export interface ParsedBrainDump {
  tasks: ParsedTask[];
  notes?: string[]; // General notes that aren't tasks
}

const SYSTEM_PROMPT = `You are a task extraction assistant for a productivity app called Bruh. Your job is to take messy, unstructured text (a "brain dump") and extract actionable tasks from it.

Rules:
1. Extract clear, actionable tasks from the text
2. Each task should have a concise, imperative title (start with a verb)
3. If there's additional context, add it as notes
4. Infer priority based on urgency words (ASAP, urgent, important = high/urgent; eventually, someday = low)
5. If dates/times are mentioned, extract them as due dates in ISO format
6. If time estimates are mentioned, extract estimated_minutes
7. If a task has sub-items, extract them as subtasks
8. Ignore filler text, greetings, and non-actionable content
9. General thoughts that aren't actionable become notes

Output valid JSON matching this schema:
{
  "tasks": [
    {
      "title": "string (required, imperative verb phrase)",
      "notes": "string (optional, additional context)",
      "priority": "low" | "normal" | "high" | "urgent" (optional, default normal),
      "due_date": "YYYY-MM-DD" (optional, only if date mentioned),
      "estimated_minutes": number (optional, only if time mentioned),
      "subtasks": ["string"] (optional, list of subtask titles)
    }
  ],
  "notes": ["string"] (optional, non-actionable thoughts)
}

Be aggressive about extracting tasks. When in doubt, make it a task.`;

export async function parseBrainDump(text: string): Promise<ParsedBrainDump> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback: simple parsing without AI
    return fallbackParse(text);
  }

  try {
    const client = new Anthropic({ apiKey });

    const today = new Date().toISOString().split("T")[0];
    const userPrompt = `Today's date is ${today}. Parse this brain dump into tasks:\n\n${text}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Extract JSON from response (might be wrapped in markdown code blocks)
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim()) as ParsedBrainDump;
    return parsed;
  } catch (error) {
    console.error("AI parsing failed, using fallback:", error);
    return fallbackParse(text);
  }
}

// Simple fallback parser when AI is unavailable
function fallbackParse(text: string): ParsedBrainDump {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const tasks: ParsedTask[] = [];

  for (const line of lines) {
    // Skip very short lines
    if (line.length < 3) continue;

    // Check for common list markers
    const cleanLine = line.replace(/^[-*•→>]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();

    if (!cleanLine) continue;

    // Detect priority
    let priority: ParsedTask["priority"] = "normal";
    if (/\b(asap|urgent|immediately|critical)\b/i.test(cleanLine)) {
      priority = "urgent";
    } else if (/\b(important|priority|must)\b/i.test(cleanLine)) {
      priority = "high";
    } else if (/\b(eventually|someday|maybe|later)\b/i.test(cleanLine)) {
      priority = "low";
    }

    // Extract time estimates
    let estimated_minutes: number | undefined;
    const timeMatch = cleanLine.match(/(\d+)\s*(min|minute|minutes|hr|hour|hours|h|m)/i);
    if (timeMatch) {
      const num = parseInt(timeMatch[1], 10);
      const unit = timeMatch[2].toLowerCase();
      if (unit.startsWith("h")) {
        estimated_minutes = num * 60;
      } else {
        estimated_minutes = num;
      }
    }

    // Clean the title
    let title = cleanLine
      .replace(/\b(asap|urgent|immediately|critical|important|priority|must|eventually|someday|maybe|later)\b/gi, "")
      .replace(/(\d+)\s*(min|minute|minutes|hr|hour|hours|h|m)/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // Skip if title is too short after cleaning
    if (title.length < 2) continue;

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    tasks.push({
      title,
      priority,
      estimated_minutes,
    });
  }

  return { tasks };
}
