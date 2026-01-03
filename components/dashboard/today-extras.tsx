"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SmartSuggestions } from "@/components/dashboard/smart-suggestions";
import { PlanningRitual } from "@/components/planning/planning-ritual";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Calendar } from "lucide-react";

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  estimated_minutes?: number;
}

interface TodayExtrasProps {
  todayTasks: Task[];
  completedTasks: Task[];
}

export function TodayExtras({ todayTasks, completedTasks }: TodayExtrasProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [ritualType, setRitualType] = useState<"morning" | "evening" | "weekly" | null>(null);
  const [showRitualPrompt, setShowRitualPrompt] = useState(false);

  // Determine which ritual to suggest based on time
  useEffect(() => {
    const hour = new Date().getHours();
    const hasCompletedRitual = localStorage.getItem(`ritual-${new Date().toDateString()}`);

    if (!hasCompletedRitual) {
      if (hour >= 5 && hour < 10) {
        setShowRitualPrompt(true);
        setRitualType("morning");
      } else if (hour >= 17 && hour < 22) {
        setShowRitualPrompt(true);
        setRitualType("evening");
      }
    }

    // Load smart suggestions
    loadSuggestions();
  }, []);

  async function loadSuggestions() {
    try {
      const res = await fetch("/api/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch {
      // Suggestions are optional, fail silently
    }
  }

  function handleRitualComplete() {
    localStorage.setItem(`ritual-${new Date().toDateString()}`, "true");
    setRitualType(null);
    setShowRitualPrompt(false);
  }

  function dismissSuggestion(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <>
      {/* Ritual Prompt */}
      {showRitualPrompt && ritualType && (
        <div className="mb-4 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {ritualType === "morning" ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-blue-400" />
            )}
            <div>
              <p className="font-medium">
                {ritualType === "morning" ? "Morning Planning" : "Evening Review"}
              </p>
              <p className="text-sm text-muted-foreground">
                {ritualType === "morning"
                  ? "Set your intentions for today"
                  : "Reflect on your day and prep for tomorrow"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRitualPrompt(false)}
            >
              Later
            </Button>
            <Button size="sm" onClick={() => setRitualType(ritualType)}>
              Start
            </Button>
          </div>
        </div>
      )}

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <SmartSuggestions
            suggestions={suggestions}
            onDismiss={dismissSuggestion}
          />
        </div>
      )}

      {/* Planning Ritual Dialog */}
      {ritualType && (
        <PlanningRitual
          type={ritualType}
          open={!!ritualType}
          onOpenChange={(open) => !open && setRitualType(null)}
          todayTasks={todayTasks}
          completedTasks={completedTasks}
          onComplete={handleRitualComplete}
        />
      )}
    </>
  );
}
