"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Clock,
  CheckCircle2,
  TrendingUp,
  X,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Suggestion {
  id: string;
  type: "time" | "task" | "habit" | "insight";
  title: string;
  description: string;
  action?: {
    type: "schedule" | "create_task" | "start_focus" | "complete_habit";
    payload: Record<string, unknown>;
  };
  confidence: number;
}

interface SmartSuggestionsProps {
  suggestions: Suggestion[];
  onDismiss?: (id: string) => void;
}

const TYPE_ICONS = {
  time: Clock,
  task: CheckCircle2,
  habit: TrendingUp,
  insight: Lightbulb,
};

const TYPE_COLORS = {
  time: "text-blue-500",
  task: "text-orange-500",
  habit: "text-green-500",
  insight: "text-purple-500",
};

export function SmartSuggestions({ suggestions, onDismiss }: SmartSuggestionsProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [executing, setExecuting] = useState<string | null>(null);

  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(s.id));

  if (visibleSuggestions.length === 0) {
    return null;
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
    onDismiss?.(id);
  }

  async function handleAction(suggestion: Suggestion) {
    if (!suggestion.action) return;

    setExecuting(suggestion.id);

    try {
      switch (suggestion.action.type) {
        case "start_focus":
          router.push("/focus");
          break;
        case "complete_habit":
          // Navigate to habits page
          router.push("/habits");
          break;
        default:
          break;
      }
    } finally {
      setExecuting(null);
      handleDismiss(suggestion.id);
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Lightbulb className="h-4 w-4" />
        Smart Suggestions
      </h3>
      <AnimatePresence mode="popLayout">
        {visibleSuggestions.map((suggestion) => {
          const Icon = TYPE_ICONS[suggestion.type];
          const colorClass = TYPE_COLORS[suggestion.type];

          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              layout
            >
              <Card className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5", colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {suggestion.description}
                      </p>
                      {suggestion.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={() => handleAction(suggestion)}
                          disabled={executing === suggestion.id}
                        >
                          {executing === suggestion.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          {suggestion.action.type === "start_focus"
                            ? "Start Focus"
                            : "Take Action"}
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
                      onClick={() => handleDismiss(suggestion.id)}
                      aria-label="Dismiss suggestion"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Server component wrapper
export function SmartSuggestionsServer({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  return <SmartSuggestions suggestions={suggestions} />;
}
