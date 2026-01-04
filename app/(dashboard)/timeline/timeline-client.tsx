"use client";

import { useRouter } from "next/navigation";
import { TimelineView } from "@/components/timeline/timeline-view";
import { updateTaskDate } from "./actions";
import { toast } from "sonner";

interface TimelineTask {
  id: string;
  title: string;
  due_date: string | null;
  estimated_minutes: number;
  status: string;
  priority: string;
  list_name?: string;
  list_color?: string;
  dependencies?: string[];
}

interface TimelineClientProps {
  tasks: TimelineTask[];
}

export function TimelineClient({ tasks }: TimelineClientProps) {
  const router = useRouter();

  async function handleDateChange(taskId: string, newDate: string) {
    const result = await updateTaskDate(taskId, newDate);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Task rescheduled");
      router.refresh();
    }
  }

  function handleTaskClick(taskId: string) {
    // Could open task detail modal or navigate
    router.push(`/today?task=${taskId}`);
  }

  return (
    <TimelineView
      tasks={tasks}
      onDateChange={handleDateChange}
      onTaskClick={handleTaskClick}
    />
  );
}
