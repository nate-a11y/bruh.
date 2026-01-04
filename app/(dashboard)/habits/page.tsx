import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { HabitCard } from "@/components/habits/habit-card";
import { HabitForm } from "@/components/habits/habit-form";
import { getHabits } from "@/app/(dashboard)/actions";
import { format } from "date-fns";

export default async function HabitsPage() {
  const supabase = await createClient();
  const habits = await getHabits();
  const today = format(new Date(), "yyyy-MM-dd");

  // Get today's logs for all habits
  const { data: todayLogs } = await supabase
    .from("zeroed_habit_logs")
    .select("habit_id, completed_count")
    .in(
      "habit_id",
      habits.map((h) => h.id)
    )
    .eq("date", today);

  const logsByHabit = new Map(todayLogs?.map((l) => [l.habit_id, l.completed_count]) || []);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Habits"
        subtitle={habits.length > 0 ? `${habits.length} tracking` : undefined}
        action={<HabitForm />}
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {habits.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No habits yet</h3>
              <p className="text-muted-foreground mb-4">
                Consistency is key. Start small.
              </p>
              <HabitForm />
            </div>
          ) : (
            habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                todayCount={logsByHabit.get(habit.id) || 0}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
