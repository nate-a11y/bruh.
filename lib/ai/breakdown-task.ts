import Anthropic from "@anthropic-ai/sdk";

export interface GeneratedSubtask {
  title: string;
  estimated_minutes?: number;
  notes?: string;
}

export interface TaskBreakdownResult {
  subtasks: GeneratedSubtask[];
  suggested_estimate?: number; // Total estimated minutes for parent
}

const BREAKDOWN_SYSTEM_PROMPT = `You are a task breakdown assistant for a productivity app called bruh. Your job is to take a complex task and break it down into smaller, actionable subtasks.

Rules:
1. Break down the task into 3-8 clear, specific subtasks
2. Each subtask should be a single, actionable step
3. Use imperative verbs (start with action words)
4. Keep subtask titles concise (under 50 characters ideally)
5. Order subtasks logically (what comes first)
6. Estimate time in minutes for each subtask (5, 10, 15, 30, 45, 60, etc.)
7. Add brief notes only if the step needs clarification
8. Don't over-complicate simple tasks
9. Consider dependencies between steps

Output valid JSON matching this schema:
{
  "subtasks": [
    {
      "title": "string (required, imperative verb phrase)",
      "estimated_minutes": number (optional, realistic estimate),
      "notes": "string (optional, only if clarification needed)"
    }
  ],
  "suggested_estimate": number (optional, total minutes for entire task)
}

Examples:
- "Plan birthday party" → Research venues, Create guest list, Send invitations, Order cake, Plan menu, Buy decorations, Prepare playlist
- "Write blog post" → Outline main points, Write first draft, Add images, Edit and proofread, Format for publishing, Schedule post
- "Prepare for job interview" → Research company, Review job description, Prepare STAR stories, Plan outfit, Print resume copies, Plan route`;

export async function breakdownTask(
  taskTitle: string,
  taskNotes?: string | null,
  context?: string
): Promise<TaskBreakdownResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback: simple breakdown without AI
    return fallbackBreakdown(taskTitle);
  }

  try {
    const client = new Anthropic({ apiKey });

    let userPrompt = `Break down this task into subtasks:\n\nTask: ${taskTitle}`;
    if (taskNotes) {
      userPrompt += `\n\nNotes: ${taskNotes}`;
    }
    if (context) {
      userPrompt += `\n\nContext: ${context}`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: BREAKDOWN_SYSTEM_PROMPT,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Extract JSON from response
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim()) as TaskBreakdownResult;
    return parsed;
  } catch (error) {
    console.error("AI breakdown failed, using fallback:", error);
    return fallbackBreakdown(taskTitle);
  }
}

// Simple fallback when AI is unavailable
function fallbackBreakdown(taskTitle: string): TaskBreakdownResult {
  // Generate generic subtasks based on common patterns
  const lowercaseTitle = taskTitle.toLowerCase();

  // Check for common task types and provide relevant subtasks
  if (lowercaseTitle.includes("write") || lowercaseTitle.includes("create") || lowercaseTitle.includes("draft")) {
    return {
      subtasks: [
        { title: "Outline main points", estimated_minutes: 15 },
        { title: "Write first draft", estimated_minutes: 30 },
        { title: "Review and edit", estimated_minutes: 20 },
        { title: "Final polish", estimated_minutes: 10 },
      ],
      suggested_estimate: 75,
    };
  }

  if (lowercaseTitle.includes("plan") || lowercaseTitle.includes("organize")) {
    return {
      subtasks: [
        { title: "Define goals and requirements", estimated_minutes: 15 },
        { title: "Research options", estimated_minutes: 20 },
        { title: "Create initial plan", estimated_minutes: 25 },
        { title: "Review and finalize", estimated_minutes: 15 },
      ],
      suggested_estimate: 75,
    };
  }

  if (lowercaseTitle.includes("review") || lowercaseTitle.includes("analyze")) {
    return {
      subtasks: [
        { title: "Gather materials", estimated_minutes: 10 },
        { title: "Initial review", estimated_minutes: 20 },
        { title: "Take notes", estimated_minutes: 15 },
        { title: "Summarize findings", estimated_minutes: 15 },
      ],
      suggested_estimate: 60,
    };
  }

  if (lowercaseTitle.includes("prepare") || lowercaseTitle.includes("setup")) {
    return {
      subtasks: [
        { title: "Identify requirements", estimated_minutes: 10 },
        { title: "Gather necessary items", estimated_minutes: 15 },
        { title: "Complete preparation", estimated_minutes: 20 },
        { title: "Final check", estimated_minutes: 10 },
      ],
      suggested_estimate: 55,
    };
  }

  // Generic fallback
  return {
    subtasks: [
      { title: "Define scope and goals", estimated_minutes: 15 },
      { title: "Complete main work", estimated_minutes: 30 },
      { title: "Review and finalize", estimated_minutes: 15 },
    ],
    suggested_estimate: 60,
  };
}
