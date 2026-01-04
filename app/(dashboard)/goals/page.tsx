import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalForm } from "@/components/goals/goal-form";
import { getGoals } from "@/app/(dashboard)/actions";

export default async function GoalsPage() {
  const goals = await getGoals();

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Goals"
        subtitle={activeGoals.length > 0 ? `${activeGoals.length} active` : undefined}
        action={<GoalForm />}
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {activeGoals.length === 0 && completedGoals.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No goals yet</h3>
              <p className="text-muted-foreground mb-4">
                What are you working towards? Set a target.
              </p>
              <GoalForm />
            </div>
          ) : (
            <>
              {activeGoals.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4">Active Goals</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeGoals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </section>
              )}

              {completedGoals.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4">Completed Goals</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {completedGoals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
