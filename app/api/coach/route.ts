import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireProApi } from "@/lib/subscriptions";
import { rateLimit } from "@/lib/rate-limit";
import { CLAUDE_MODEL } from "@/lib/ai/model";

interface CoachTask {
  title: string;
  due_date: string | null;
  created_at: string;
}

interface CoachReply {
  message: string;
  suggestion: string;
}

const SYSTEM_PROMPT = `You are a warm, ADHD-aware accountability coach inside a task app called bruh. You give a short, gentle check-in based on the user's open tasks.

Voice:
- Encouraging and human, like a supportive friend who gets executive dysfunction. Never a nag.
- No shame, no guilt trips, no lectures, no toxic positivity.
- Calm punctuation. Do not spam exclamation points (one at most, and only if it feels natural).
- Specific, not generic. Reference what's actually on their plate (counts, how long something has sat, an overdue item) when it helps.

Return ONLY valid JSON in this exact shape:
{"message": "2 to 3 sentence warm check-in", "suggestion": "one concrete, tiny next step"}

The "message" is the check-in. The "suggestion" is a single low-friction action they could take right now (for example: break one scary task into smaller pieces, pick the oldest thing and do 5 minutes, or just clear one quick win). Keep the suggestion to one sentence.`;

/** Deterministic fallback when the AI is unavailable, so the card still helps. */
function fallbackReply(tasks: CoachTask[], overdueCount: number): CoachReply {
  if (tasks.length === 0) {
    return {
      message: "Your list is clear right now. That's a genuine win, not an accident. Enjoy the breathing room.",
      suggestion: "Take a beat before adding anything new. You've earned it.",
    };
  }
  if (overdueCount > 0) {
    return {
      message: `You've got ${overdueCount} thing${overdueCount === 1 ? "" : "s"} sitting past due. No judgment here, life happens. Let's make one of them feel smaller.`,
      suggestion: "Pick the least scary overdue task and give it just 5 minutes.",
    };
  }
  return {
    message: `You've got ${tasks.length} task${tasks.length === 1 ? "" : "s"} open. That's a normal amount of life to carry. You don't have to do it all at once.`,
    suggestion: "Choose one task and take the smallest possible first step.",
  };
}

async function coach(tasks: CoachTask[], overdueCount: number): Promise<CoachReply> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || tasks.length === 0) return fallbackReply(tasks, overdueCount);

  try {
    const client = new Anthropic({ apiKey });
    const today = new Date().toISOString().split("T")[0];
    const list = tasks
      .map((t) => {
        const overdue = t.due_date && t.due_date < today ? " (OVERDUE)" : "";
        const age = Math.max(
          0,
          Math.round((Date.now() - Date.parse(t.created_at)) / 86400000)
        );
        return `- ${t.title} | due=${t.due_date ?? "none"}${overdue} | added ${age}d ago`;
      })
      .join("\n");

    // Adaptive thinking is accepted by the API on the current models; the
    // installed SDK's types predate it, so build the body and cast past the
    // stale `thinking` union.
    const params = {
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" as const },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user" as const,
          content: `Today is ${today}. The user has ${tasks.length} open task${tasks.length === 1 ? "" : "s"} (${overdueCount} overdue):\n${list}\n\nGive them a warm check-in and one concrete next step.`,
        },
      ],
    };

    const response = await client.messages.create(
      params as unknown as Anthropic.MessageCreateParamsNonStreaming
    );

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return fallbackReply(tasks, overdueCount);

    let jsonStr = textBlock.text;
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1];
    const parsed = JSON.parse(jsonStr.trim()) as Partial<CoachReply>;

    const fallback = fallbackReply(tasks, overdueCount);
    return {
      message: parsed.message?.trim() || fallback.message,
      suggestion: parsed.suggestion?.trim() || fallback.suggestion,
    };
  } catch (error) {
    console.error("Coach AI failed, using fallback:", error);
    return fallbackReply(tasks, overdueCount);
  }
}

/**
 * AI accountability coach: a gentle, ADHD-aware check-in based on the user's
 * open tasks. Pro feature — gated server-side, fails closed.
 */
export async function GET() {
  const gate = await requireProApi();
  if ("response" in gate) return gate.response;
  const { user } = gate;

  const rl = await rateLimit("ai", user.id);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit exceeded, slow down." }, { status: 429 });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Pending + overdue tasks: soonest-due first, cap at 30 so the prompt stays lean.
  const { data: tasks } = await supabase
    .from("zeroed_tasks")
    .select("title, due_date, created_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(30);

  const list: CoachTask[] = tasks || [];
  const overdueCount = list.filter((t) => t.due_date && t.due_date < today).length;

  const reply = await coach(list, overdueCount);
  return NextResponse.json(reply);
}
