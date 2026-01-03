"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  Calendar,
  Target,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock,
  TrendingUp,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type RitualType = "morning" | "evening" | "weekly";

interface Task {
  id: string;
  title: string;
  priority: string;
  estimated_minutes?: number;
  status: string;
}

interface RitualStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

interface PlanningRitualProps {
  type: RitualType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayTasks?: Task[];
  completedTasks?: Task[];
  weeklyStats?: {
    tasksCompleted: number;
    focusMinutes: number;
    streak: number;
  };
  onComplete?: (data: RitualData) => void;
}

interface RitualData {
  type: RitualType;
  reflection?: string;
  priorities?: string[];
  completedAt: string;
}

const RITUAL_CONFIG: Record<RitualType, { icon: React.ReactNode; title: string; greeting: string }> = {
  morning: {
    icon: <Sun className="h-6 w-6 text-yellow-500" />,
    title: "Morning Planning",
    greeting: "Good morning! Let's set up your day.",
  },
  evening: {
    icon: <Moon className="h-6 w-6 text-blue-400" />,
    title: "Evening Review",
    greeting: "Time to reflect on your day.",
  },
  weekly: {
    icon: <Calendar className="h-6 w-6 text-purple-500" />,
    title: "Weekly Planning",
    greeting: "Let's plan your week ahead.",
  },
};

export function PlanningRitual({
  type,
  open,
  onOpenChange,
  todayTasks = [],
  completedTasks = [],
  weeklyStats,
  onComplete,
}: PlanningRitualProps) {
  const [step, setStep] = useState(0);
  const [reflection, setReflection] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  const config = RITUAL_CONFIG[type];
  const pendingTasks = todayTasks.filter((t) => t.status !== "completed");
  const completedCount = todayTasks.filter((t) => t.status === "completed").length;

  // Reset when opening
  useEffect(() => {
    if (open) {
      setStep(0);
      setReflection("");
      setPriorities([]);
    }
  }, [open]);

  const steps = getSteps();

  function getSteps(): RitualStep[] {
    if (type === "morning") {
      return [
        {
          id: "overview",
          title: "Today's Overview",
          description: "Here's what you have planned",
          component: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold">{todayTasks.length}</p>
                    <p className="text-sm text-muted-foreground">Tasks Today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold">
                      {Math.round(todayTasks.reduce((s, t) => s + (t.estimated_minutes || 0), 0) / 60)}h
                    </p>
                    <p className="text-sm text-muted-foreground">Estimated</p>
                  </CardContent>
                </Card>
              </div>
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Today's Tasks</h4>
                  {pendingTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "p-2 rounded border text-sm",
                        task.priority === "urgent" && "border-red-500/50",
                        task.priority === "high" && "border-orange-500/50"
                      )}
                    >
                      {task.title}
                    </div>
                  ))}
                  {pendingTasks.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      +{pendingTasks.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          ),
        },
        {
          id: "priorities",
          title: "Set Your Priorities",
          description: "What are your top 3 priorities for today?",
          component: (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                Focus on what matters most
              </div>
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-muted-foreground w-6">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      placeholder={`Priority ${i + 1}`}
                      className="flex-1 p-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      value={priorities[i] || ""}
                      onChange={(e) => {
                        const newPriorities = [...priorities];
                        newPriorities[i] = e.target.value;
                        setPriorities(newPriorities);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          id: "intention",
          title: "Set Your Intention",
          description: "How do you want to show up today?",
          component: (
            <Textarea
              placeholder="Today I will focus on..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="min-h-[120px]"
            />
          ),
        },
      ];
    }

    if (type === "evening") {
      return [
        {
          id: "accomplishments",
          title: "Today's Accomplishments",
          description: "Look at what you achieved",
          component: (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary">{completedCount}</div>
                  <p className="text-muted-foreground mt-1">Tasks Completed</p>
                </div>
              </div>
              <Progress value={(completedCount / (todayTasks.length || 1)) * 100} className="h-2" />
              {completedCount > 0 && (
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {completedTasks.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="line-through">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ),
        },
        {
          id: "wins",
          title: "Celebrate Wins",
          description: "What went well today?",
          component: (
            <Textarea
              placeholder="My wins today were..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="min-h-[120px]"
            />
          ),
        },
        {
          id: "tomorrow",
          title: "Plan Tomorrow",
          description: "What's most important for tomorrow?",
          component: (
            <div className="space-y-4">
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      placeholder={`Tomorrow's priority ${i + 1}`}
                      className="flex-1 p-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      value={priorities[i] || ""}
                      onChange={(e) => {
                        const newPriorities = [...priorities];
                        newPriorities[i] = e.target.value;
                        setPriorities(newPriorities);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ),
        },
      ];
    }

    // Weekly
    return [
      {
        id: "week-review",
        title: "Week in Review",
        description: "Let's see how your week went",
        component: (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{weeklyStats?.tasksCompleted || 0}</p>
                  <p className="text-xs text-muted-foreground">Tasks Done</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">
                    {Math.round((weeklyStats?.focusMinutes || 0) / 60)}h
                  </p>
                  <p className="text-xs text-muted-foreground">Focused</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold">{weeklyStats?.streak || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ),
      },
      {
        id: "reflection",
        title: "Weekly Reflection",
        description: "What did you learn this week?",
        component: (
          <div className="space-y-4">
            <Textarea
              placeholder="This week I learned... / I'm proud of... / I could improve..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
        ),
      },
      {
        id: "next-week",
        title: "Next Week's Focus",
        description: "What are your goals for next week?",
        component: (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Sparkles className="h-4 w-4" />
              Set 3 objectives for the week
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    placeholder={`Weekly objective ${i + 1}`}
                    className="flex-1 p-2 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={priorities[i] || ""}
                    onChange={(e) => {
                      const newPriorities = [...priorities];
                      newPriorities[i] = e.target.value;
                      setPriorities(newPriorities);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ];
  }

  async function handleComplete() {
    setIsCompleting(true);
    try {
      await onComplete?.({
        type,
        reflection,
        priorities: priorities.filter(Boolean),
        completedAt: new Date().toISOString(),
      });
      onOpenChange(false);
    } finally {
      setIsCompleting(false);
    }
  }

  const isLastStep = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.greeting}</DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Progress value={progress} className="h-1 flex-1" />
          <span>
            {step + 1}/{steps.length}
          </span>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="py-4"
          >
            <h3 className="font-semibold mb-1">{steps[step].title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{steps[step].description}</p>
            {steps[step].component}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => (step > 0 ? setStep(step - 1) : onOpenChange(false))}
          >
            {step > 0 ? "Back" : "Skip"}
          </Button>
          <Button onClick={isLastStep ? handleComplete : () => setStep(step + 1)} disabled={isCompleting}>
            {isCompleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLastStep ? (
              <>
                Complete
                <CheckCircle2 className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if ritual should be shown
export function useRitualPrompt() {
  const [ritualType, setRitualType] = useState<RitualType | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    const lastMorning = localStorage.getItem("bruh-last-morning-ritual");
    const lastEvening = localStorage.getItem("bruh-last-evening-ritual");
    const today = format(new Date(), "yyyy-MM-dd");

    // Morning ritual: 6-10 AM
    if (hour >= 6 && hour < 10 && lastMorning !== today) {
      setRitualType("morning");
    }
    // Evening ritual: 5-9 PM
    else if (hour >= 17 && hour < 21 && lastEvening !== today) {
      setRitualType("evening");
    }
  }, []);

  function dismissRitual() {
    const today = format(new Date(), "yyyy-MM-dd");
    if (ritualType === "morning") {
      localStorage.setItem("bruh-last-morning-ritual", today);
    } else if (ritualType === "evening") {
      localStorage.setItem("bruh-last-evening-ritual", today);
    }
    setRitualType(null);
  }

  return { ritualType, dismissRitual };
}
