"use client";

import { useState } from "react";
import { Moon, ArrowRight, Check, Trophy, Calendar, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { completeShutdownRoutine, updateTask } from "@/app/(dashboard)/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/lib/supabase/types";

interface ShutdownFlowProps {
  completedTasks: TaskWithRelations[];
  incompleteTasks: TaskWithRelations[];
  todayStats: {
    tasks_completed?: number;
    focus_minutes?: number;
    sessions_completed?: number;
  } | null;
  dailyIntention: string | null;
}

const STEPS = [
  { id: 'celebrate', title: 'Celebrate Wins', icon: Trophy },
  { id: 'review', title: 'Review Incomplete', icon: Calendar },
  { id: 'reflect', title: 'Reflect', icon: Star },
  { id: 'complete', title: 'Shutdown Complete', icon: Moon },
];

export function ShutdownFlow({
  completedTasks,
  incompleteTasks,
  todayStats,
  dailyIntention,
}: ShutdownFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [reflection, setReflection] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const step = STEPS[currentStep];
  const Icon = step.icon;

  async function handleIncompleteAction(taskId: string, action: 'tomorrow' | 'next_week') {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await updateTask(taskId, {
      due_date: action === 'tomorrow' ? tomorrow : nextWeek
    });
    toast.success("Task rescheduled");
  }

  async function handleComplete() {
    setIsSubmitting(true);
    await completeShutdownRoutine();
    toast.success("Shutdown complete. Rest well!");
    router.push("/today");
  }

  function nextStep() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <Progress value={progress} className="h-1" />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Moon className="h-5 w-5" />
            <span className="text-sm">Evening Shutdown</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/today")}>
            Skip
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          {/* Step icon and title */}
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{step.title}</h1>
          </div>

          {/* Step 0: Celebrate Wins */}
          {currentStep === 0 && (
            <div className="space-y-4">
              {todayStats ? (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-green-500">{todayStats.tasks_completed || 0}</p>
                      <p className="text-xs text-muted-foreground">Tasks Done</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold">{Math.round((todayStats.focus_minutes || 0) / 60)}h</p>
                      <p className="text-xs text-muted-foreground">Focus Time</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold">{todayStats.sessions_completed || 0}</p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  No stats recorded today. Every day is a new opportunity!
                </p>
              )}

              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    You completed {completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''} today!
                  </p>
                  <div className="max-h-40 overflow-auto space-y-1">
                    {completedTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm p-2 bg-green-500/10 rounded">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={nextStep}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 1: Review Incomplete */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {incompleteTasks.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  All tasks complete! Amazing work today!
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    {incompleteTasks.length} task{incompleteTasks.length !== 1 ? 's' : ''} incomplete - schedule for later
                  </p>
                  {incompleteTasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <span className="truncate flex-1">{task.title}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleIncompleteAction(task.id, 'tomorrow')}
                          >
                            Tomorrow
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleIncompleteAction(task.id, 'next_week')}
                          >
                            Next Week
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Button className="w-full" onClick={nextStep}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Reflect */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {dailyIntention && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Today&apos;s intention was:</p>
                    <p className="italic">&quot;{dailyIntention}&quot;</p>
                  </CardContent>
                </Card>
              )}

              <p className="text-center text-muted-foreground">
                What went well today?
              </p>

              <Textarea
                placeholder="Today I'm grateful for..."
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={3}
              />

              <Button className="w-full" onClick={nextStep}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 3: Complete */}
          {currentStep === 3 && (
            <div className="space-y-4 text-center">
              <div className="h-20 w-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
                <Moon className="h-10 w-10 text-purple-500" />
              </div>
              <p className="text-muted-foreground">
                Your mind is clear. Tomorrow is planned. Rest well!
              </p>

              <Button className="w-full" onClick={handleComplete} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Complete Shutdown"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
