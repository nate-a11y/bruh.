"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Sparkles, ListTodo, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { completeOnboarding } from "@/app/(dashboard)/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Sensible defaults so we never block first-run on preference-tweaking. Users
// can fine-tune the daily goal and focus length later in Settings.
const DEFAULT_DAILY_GOAL = 5;
const DEFAULT_FOCUS_MINUTES = 25;

const steps = [
  { id: "welcome", title: "Welcome to bruh.", icon: Sparkles },
  { id: "first-task", title: "One thing on your mind", icon: ListTodo },
];

export function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [prefs, setPrefs] = useState({
    displayName: "",
    firstTask: "",
  });

  async function handleComplete() {
    if (submitting) return;
    setSubmitting(true);

    const result = await completeOnboarding(
      {
        display_name: prefs.displayName.trim(),
        daily_goal_tasks: DEFAULT_DAILY_GOAL,
        default_focus_minutes: DEFAULT_FOCUS_MINUTES,
      },
      prefs.firstTask.trim() || undefined
    );

    if (result.error) {
      toast.error(result.error);
      setSubmitting(false);
    } else {
      toast.success("You're in. Let's go.");
      router.push("/today");
      router.refresh();
    }
  }

  function next() {
    if (currentStep === steps.length - 1) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <Progress value={((currentStep + 1) / steps.length) * 100} className="mb-8" />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-4">{step.title}</h1>

            {currentStep === 0 && (
              <div className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  No setup slog. Two taps and you&apos;re in. First up: what should we call you?
                </p>
                <Input
                  placeholder="Your name"
                  value={prefs.displayName}
                  autoFocus
                  onChange={(e) => setPrefs({ ...prefs, displayName: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && prefs.displayName.trim()) next();
                  }}
                  className="text-center"
                />
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  Whatever&apos;s been rattling around your head, drop it here. We&apos;ll put it on today so you start with a win.
                </p>
                <Input
                  placeholder="e.g., Finally finish that thing"
                  value={prefs.firstTask}
                  autoFocus
                  onChange={(e) => setPrefs({ ...prefs, firstTask: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") next();
                  }}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground">
                  Nothing yet? Skip it. You can brain-dump anytime with ⌘B.
                </p>
              </div>
            )}

            <Button
              onClick={next}
              disabled={(currentStep === 0 && !prefs.displayName.trim()) || submitting}
              className="mt-8 w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting you up
                </>
              ) : isLastStep ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {prefs.firstTask.trim() ? "Add it and go" : "Jump in"}
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {isLastStep && !prefs.firstTask.trim() && (
              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting}
                className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Skip for now
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
