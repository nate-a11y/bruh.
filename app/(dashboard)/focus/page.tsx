import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { FocusTimer } from "@/components/focus/focus-timer";

export default async function FocusPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch user preferences
  const { data: preferences } = await supabase
    .from("zeroed_user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Fetch pending tasks for task selection
  const { data: tasks } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(name, color)")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  const defaultFocusMinutes = preferences?.default_focus_minutes || 25;
  const shortBreakMinutes = preferences?.short_break_minutes || 5;
  const longBreakMinutes = preferences?.long_break_minutes || 15;
  const sessionsBeforeLongBreak = preferences?.sessions_before_long_break || 4;
  const soundEnabled = preferences?.sound_enabled ?? true;

  return (
    <div className="flex flex-col h-full">
      <Header title="Focus Mode" showTimer={false} />

      <div className="flex-1 flex items-center justify-center p-6">
        <FocusTimer
          tasks={tasks || []}
          defaultFocusMinutes={defaultFocusMinutes}
          shortBreakMinutes={shortBreakMinutes}
          longBreakMinutes={longBreakMinutes}
          sessionsBeforeLongBreak={sessionsBeforeLongBreak}
          soundEnabled={soundEnabled}
        />
      </div>
    </div>
  );
}
