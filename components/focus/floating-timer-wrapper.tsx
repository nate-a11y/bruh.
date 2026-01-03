"use client";

import { useEffect } from "react";
import { FloatingTimer } from "./floating-timer";
import { useTimerStore } from "@/lib/hooks/use-timer";

export function FloatingTimerWrapper() {
  const hydrateTimer = useTimerStore((state) => state.hydrateTimer);

  // Recalculate timer on mount (handles page refresh while timer was running)
  useEffect(() => {
    hydrateTimer();
  }, [hydrateTimer]);

  return <FloatingTimer />;
}
