"use client";

import { useState } from "react";
import { Sun, ArrowRight, Check, Calendar, Target, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { saveDailyIntention, updateTask, deleteTask } from "@/app/(dashboard)/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/lib/supabase/types";

interface DailyPlanningFlowProps {
  carryoverTasks: TaskWithRelations[];
  todayTasks: TaskWithRelations[];
  yesterdayStats: {
    tasks_completed?: number;
    focus_minutes?: number;
    sessions_completed?: number;
  } | null;
  previousIntention: string | null;
  alreadyPlanned: boolean;
}

const STEPS = [
  { id: 'review', title: 'Review Yesterday', icon: RotateCcw },
  { id: 'carryover', title: 'Handle Carryover', icon: Calendar },
  { id: 'today', title: "Today's Tasks", icon: Target },
  { id: 'intention', title: 'Set Intention', icon: Sparkles },
  { id: 'complete', title: 'Ready!', icon: Check },
];

export function DailyPlanningFlow({
  carryoverTasks,
  todayTasks,
  yesterdayStats,
  previousIntention,
  alreadyPlanned,
}: DailyPlanningFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(alreadyPlanned ? 4 : 0);
  const [intention, setIntention] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const step = STEPS[currentStep];
  const Icon = step.icon;

  async function handleCarryoverAction(taskId: string, action: 'today' | 'tomorrow' | 'delete') {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (action === 'today') {
      await updateTask(taskId, { due_date: today });
    } else if (action === 'tomorrow') {
      await updateTask(taskId, { due_date: tomorrow });
    } else {
      await deleteTask(taskId);
    }
  }

  async function handleComplete() {
    setIsSubmitting(true);
    await saveDailyIntention(intention);
    toast.success("Planning complete! Have a productive day");
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
            <Sun className="h-5 w-5" />
            <span className="text-sm">Morning Planning</span>
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

          {/* Step 0: Review Yesterday */}
          {currentStep === 0 && (
            <div className="space-y-4">
              {yesterdayStats ? (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold">{yesterdayStats.tasks_completed || 0}</p>
                      <p className="text-xs text-muted-foreground">Tasks Done</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold">{Math.round((yesterdayStats.focus_minutes || 0) / 60)}h</p>
                      <p className="text-xs text-muted-foreground">Focus Time</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold">{yesterdayStats.sessions_completed || 0}</p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  No data from yesterday. Let&apos;s make today count!
                </p>
              )}

              {previousIntention && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Yesterday&apos;s intention:</p>
                    <p className="italic">&quot;{previousIntention}&quot;</p>
                  </CardContent>
                </Card>
              )}

              <Button className="w-full" onClick={nextStep}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 1: Handle Carryover */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {carryoverTasks.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No overdue tasks! You&apos;re on top of things
                </p>
              ) : (
                <div className="space-y-2">
                  {carryoverTasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <span className="truncate flex-1">{task.title}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCarryoverAction(task.id, 'today')}
                          >
                            Today
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCarryoverAction(task.id, 'tomorrow')}
                          >
                            Later
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

          {/* Step 2: Today's Tasks */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                You have {todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''} scheduled for today
              </p>

              {todayTasks.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {todayTasks.slice(0, 5).map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="truncate">{task.title}</span>
                      </CardContent>
                    </Card>
                  ))}
                  {todayTasks.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{todayTasks.length - 5} more tasks
                    </p>
                  )}
                </div>
              )}

              <Button className="w-full" onClick={nextStep}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 3: Set Intention */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                What&apos;s your main focus for today?
              </p>

              <Textarea
                placeholder="e.g., Ship the new feature, deep work on project X..."
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                rows={3}
              />

              <Button className="w-full" onClick={nextStep}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="space-y-4 text-center">
              <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <Check className="h-10 w-10 text-green-500" />
              </div>
              <p className="text-muted-foreground">
                You&apos;re all set for a productive day!
              </p>

              <Button className="w-full" onClick={handleComplete} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Start Your Day"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
