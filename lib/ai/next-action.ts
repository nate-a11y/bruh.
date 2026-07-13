import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "./model";

export interface NextActionInput {
  id: string;
  title: string;
  priority?: string | null;
  due_date?: string | null;
  estimated_minutes?: number | null;
  notes?: string | null;
}

export interface NextAction {
  taskId: string;
  title: string;
  firstStep: string; // a tiny, concrete 5-minute starting move
  minutes: number; // suggested focus block
  reason: string; // one short, encouraging sentence
}

const SYSTEM_PROMPT = `You are a gentle, no-nonsense focus coach for people with ADHD. Given a list of a user's pending tasks, pick the SINGLE best one to do next and make starting it feel effortless.

Rules:
- Choose exactly one task. Prefer overdue/urgent things, but avoid overwhelming: if everything is huge, pick the one with the smallest activation energy.
- Give a "firstStep": one absurdly small, concrete first action (something they can do in 5 minutes or less). Beat task paralysis by making the start trivial.
- Suggest a focus block length in minutes (5-25).
- Give a "reason": ONE short, warm, encouraging sentence. No shame, no lectures.

Output ONLY valid JSON: {"taskId": "the id", "firstStep": "string", "minutes": number, "reason": "string"}`;

const priorityRank: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/** Deterministic fallback: soonest-due, then highest priority, tiny first step. */
function fallbackPick(tasks: NextActionInput[]): NextAction | null {
  if (tasks.length === 0) return null;
  const sorted = [...tasks].sort((a, b) => {
    const ad = a.due_date ? Date.parse(a.due_date) : Infinity;
    const bd = b.due_date ? Date.parse(b.due_date) : Infinity;
    if (ad !== bd) return ad - bd;
    return (priorityRank[a.priority ?? "normal"] ?? 2) - (priorityRank[b.priority ?? "normal"] ?? 2);
  });
  const t = sorted[0];
  return {
    taskId: t.id,
    title: t.title,
    firstStep: "Open it and work for just 5 minutes. That's it.",
    minutes: Math.min(25, Math.max(5, t.estimated_minutes ?? 15)),
    reason: "Start here. Small step, momentum follows.",
  };
}

export async function pickNextAction(tasks: NextActionInput[]): Promise<NextAction | null> {
  if (tasks.length === 0) return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackPick(tasks);

  try {
    const client = new Anthropic({ apiKey });
    const today = new Date().toISOString().split("T")[0];
    const list = tasks
      .slice(0, 40)
      .map(
        (t) =>
          `- id=${t.id} | ${t.title} | priority=${t.priority ?? "normal"} | due=${t.due_date ?? "none"} | est=${t.estimated_minutes ?? "?"}min`
      )
      .join("\n");

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Today is ${today}. Pending tasks:\n${list}\n\nPick the next one.` },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return fallbackPick(tasks);

    let jsonStr = content.text;
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1];
    const parsed = JSON.parse(jsonStr.trim()) as {
      taskId: string;
      firstStep: string;
      minutes: number;
      reason: string;
    };

    const chosen = tasks.find((t) => t.id === parsed.taskId) ?? tasks[0];
    return {
      taskId: chosen.id,
      title: chosen.title,
      firstStep: parsed.firstStep || "Open it and work for 5 minutes.",
      minutes: Math.min(60, Math.max(5, parsed.minutes || 15)),
      reason: parsed.reason || "Start here.",
    };
  } catch (error) {
    console.error("pickNextAction AI failed, using fallback:", error);
    return fallbackPick(tasks);
  }
}
