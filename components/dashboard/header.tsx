"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Timer, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimerStore } from "@/lib/hooks/use-timer";
import { formatTimerDisplay } from "@/lib/utils";
import { CommandMenu } from "./command-menu";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showTimer?: boolean;
}

export function Header({ title, subtitle, action, showTimer = true }: HeaderProps) {
  const { state, timeRemaining, task, pauseTimer, resumeTimer } =
    useTimerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isTimerActive = state === "running" || state === "paused" || state === "break";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Active Timer Indicator */}
        {mounted && showTimer && isTimerActive && (
          <Link href="/focus">
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm">
              <Timer className="h-4 w-4 text-primary animate-pulse" />
              <span className="font-mono font-medium">
                {formatTimerDisplay(timeRemaining)}
              </span>
              {task && (
                <span className="hidden sm:inline max-w-[120px] truncate text-muted-foreground">
                  {task.title}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.preventDefault();
                  if (state === "paused") {
                    resumeTimer();
                  } else {
                    pauseTimer();
                  }
                }}
              >
                {state === "paused" ? (
                  <Play className="h-3 w-3" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
              </Button>
            </div>
          </Link>
        )}

        {action}

        <CommandMenu />
      </div>
    </header>
  );
}
