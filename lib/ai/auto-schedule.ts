import Anthropic from "@anthropic-ai/sdk";
import { format, addDays, parseISO, isBefore, startOfDay } from "date-fns";

const client = new Anthropic();

interface TaskToSchedule {
  id: string;
  title: string;
  estimated_minutes: number;
  due_date?: string | null;
  priority: "low" | "normal" | "high" | "urgent";
}

interface ScheduledEvent {
  start_time: string; // HH:mm
  end_time: string;
  title: string;
  is_task?: boolean;
}

interface ScheduledSlot {
  task_id: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  reasoning: string;
}

interface SchedulePreferences {
  workHoursStart: number; // 9
  workHoursEnd: number; // 18
  preferMorningForHard: boolean;
  bufferMinutes: number; // 15 min between tasks
  maxHoursPerDay: number; // 6 hours of scheduled work max
}

const DEFAULT_PREFERENCES: SchedulePreferences = {
  workHoursStart: 9,
  workHoursEnd: 18,
  preferMorningForHard: true,
  bufferMinutes: 15,
  maxHoursPerDay: 6,
};

/**
 * Find available time slots for a given day
 */
function findAvailableSlots(
  date: string,
  existingEvents: ScheduledEvent[],
  preferences: SchedulePreferences
): { start: string; end: string; duration: number }[] {
  const slots: { start: string; end: string; duration: number }[] = [];
  const { workHoursStart, workHoursEnd, bufferMinutes } = preferences;

  // Convert work hours to minutes from midnight
  const dayStart = workHoursStart * 60;
  const dayEnd = workHoursEnd * 60;

  // Convert existing events to minute ranges
  const busyRanges = existingEvents
    .map((event) => {
      const [startH, startM] = event.start_time.split(":").map(Number);
      const [endH, endM] = event.end_time.split(":").map(Number);
      return {
        start: startH * 60 + startM - bufferMinutes,
        end: endH * 60 + endM + bufferMinutes,
      };
    })
    .sort((a, b) => a.start - b.start);

  // Find gaps
  let currentTime = dayStart;
  for (const busy of busyRanges) {
    if (busy.start > currentTime) {
      const duration = busy.start - currentTime;
      if (duration >= 30) {
        // Minimum 30 min slot
        slots.push({
          start: `${Math.floor(currentTime / 60)
            .toString()
            .padStart(2, "0")}:${(currentTime % 60).toString().padStart(2, "0")}`,
          end: `${Math.floor(busy.start / 60)
            .toString()
            .padStart(2, "0")}:${(busy.start % 60).toString().padStart(2, "0")}`,
          duration,
        });
      }
    }
    currentTime = Math.max(currentTime, busy.end);
  }

  // Check remaining time until end of day
  if (currentTime < dayEnd) {
    const duration = dayEnd - currentTime;
    if (duration >= 30) {
      slots.push({
        start: `${Math.floor(currentTime / 60)
          .toString()
          .padStart(2, "0")}:${(currentTime % 60).toString().padStart(2, "0")}`,
        end: `${Math.floor(dayEnd / 60)
          .toString()
          .padStart(2, "0")}:${(dayEnd % 60).toString().padStart(2, "0")}`,
        duration,
      });
    }
  }

  return slots;
}

/**
 * AI-powered optimal time slot finder
 */
export async function findOptimalTimeSlot(
  task: TaskToSchedule,
  existingEventsByDay: Record<string, ScheduledEvent[]>,
  preferences: SchedulePreferences = DEFAULT_PREFERENCES
): Promise<ScheduledSlot | null> {
  // Look ahead 7 days (or until due date)
  const today = startOfDay(new Date());
  const maxDate = task.due_date
    ? parseISO(task.due_date)
    : addDays(today, 7);

  // Collect available slots across days
  const availableSlotsByDay: Record<
    string,
    { start: string; end: string; duration: number }[]
  > = {};

  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    if (isBefore(maxDate, date)) break;

    const dateStr = format(date, "yyyy-MM-dd");
    const events = existingEventsByDay[dateStr] || [];
    const slots = findAvailableSlots(dateStr, events, preferences);

    // Filter slots that can fit the task
    const fittingSlots = slots.filter(
      (s) => s.duration >= (task.estimated_minutes || 30)
    );

    if (fittingSlots.length > 0) {
      availableSlotsByDay[dateStr] = fittingSlots;
    }
  }

  if (Object.keys(availableSlotsByDay).length === 0) {
    return null; // No available slots
  }

  // Use AI to pick the optimal slot
  const prompt = `You are a smart scheduling assistant. Find the optimal time slot for this task.

TASK:
- Title: ${task.title}
- Duration: ${task.estimated_minutes || 30} minutes
- Priority: ${task.priority}
- Due Date: ${task.due_date || "No deadline"}

AVAILABLE SLOTS (by date):
${Object.entries(availableSlotsByDay)
  .map(
    ([date, slots]) =>
      `${date}:\n${slots.map((s) => `  - ${s.start} to ${s.end} (${s.duration} min available)`).join("\n")}`
  )
  .join("\n\n")}

SCHEDULING PREFERENCES:
- Work hours: ${preferences.workHoursStart}:00 - ${preferences.workHoursEnd}:00
- Prefer morning for difficult/high-priority tasks: ${preferences.preferMorningForHard}
- Buffer between tasks: ${preferences.bufferMinutes} minutes

Pick the BEST time slot considering:
1. Priority tasks should be scheduled sooner, ideally in morning when focus is highest
2. Leave buffer time around meetings
3. Don't overload any single day
4. Respect the due date - schedule before it!
5. Group similar duration tasks if possible

Respond with ONLY valid JSON:
{
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "reasoning": "Brief explanation of why this slot is optimal"
}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]);
    return {
      task_id: task.id,
      date: result.date,
      time: result.time,
      reasoning: result.reasoning,
    };
  } catch (error) {
    console.error("AI scheduling error:", error);
    // Fallback: pick first available slot
    const firstDay = Object.keys(availableSlotsByDay)[0];
    const firstSlot = availableSlotsByDay[firstDay][0];
    return {
      task_id: task.id,
      date: firstDay,
      time: firstSlot.start,
      reasoning: "Scheduled to first available slot",
    };
  }
}

/**
 * Auto-schedule multiple tasks at once
 */
export async function autoScheduleTasks(
  tasks: TaskToSchedule[],
  existingEventsByDay: Record<string, ScheduledEvent[]>,
  preferences: SchedulePreferences = DEFAULT_PREFERENCES
): Promise<ScheduledSlot[]> {
  const results: ScheduledSlot[] = [];
  const updatedEvents = { ...existingEventsByDay };

  // Sort tasks by priority and due date
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const priorityDiff =
      priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by due date (sooner first)
    if (a.due_date && b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  for (const task of sortedTasks) {
    const slot = await findOptimalTimeSlot(task, updatedEvents, preferences);
    if (slot) {
      results.push(slot);

      // Update events for next iteration
      if (!updatedEvents[slot.date]) {
        updatedEvents[slot.date] = [];
      }
      const endMinutes =
        parseInt(slot.time.split(":")[0]) * 60 +
        parseInt(slot.time.split(":")[1]) +
        (task.estimated_minutes || 30);
      updatedEvents[slot.date].push({
        start_time: slot.time,
        end_time: `${Math.floor(endMinutes / 60)
          .toString()
          .padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`,
        title: task.title,
        is_task: true,
      });
    }
  }

  return results;
}
