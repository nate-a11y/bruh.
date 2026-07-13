"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = "bruh_tour_done_v1";

function runTour() {
  // On desktop the sidebar is visible, so we spotlight the real nav items. On
  // mobile it's collapsed behind a menu, so those steps become centered cards
  // (targeting a hidden element would break the spotlight).
  const isDesktop =
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  const navStep = (tourId: string, title: string, description: string) =>
    isDesktop
      ? { element: `[data-tour="${tourId}"]`, popover: { title, description } }
      : { popover: { title, description } };

  const tour = driver({
    showProgress: true,
    allowClose: true,
    popoverClass: "bruh-tour",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    steps: [
      {
        popover: {
          title: "Welcome to bruh. 👋",
          description:
            "Quick tour of everything. Skip anytime with Esc, or replay it later from Take a tour.",
        },
      },
      navStep("today", "Today", "Your day at a glance: what's due, scheduled, and up next."),
      navStep("calendar", "Calendar", "See everything on a calendar and drag to reschedule."),
      navStep("lists", "Lists", "Organize tasks into lists and projects, your way."),
      navStep("focus", "Focus mode", "Lock in with a visual timer, ambient sound, and focus music."),
      navStep("goals", "Goals", "Track the bigger stuff and see your progress toward it."),
      navStep("habits", "Habits", "Build habits without the streak guilt. Miss a day? We move on."),
      navStep("stats", "Stats", "See what you've actually gotten done. Proof you're moving."),
      navStep("teams", "Teams", "Bring people in and share projects (per-seat billing)."),
      navStep("insights", "Insights (Pro)", "Your best focus hours, streaks, and momentum over time."),
      {
        popover: {
          title: "Brain dump",
          description:
            "Overwhelmed? Press ⌘B (or the mic on Pro), word-vomit everything on your mind, and AI sorts it into clear tasks.",
        },
      },
      navStep("refer", "Refer a friend", "Give a friend Pro, get a free month when they subscribe."),
      navStep("roadmap", "Roadmap", "Vote on what we build next, or suggest your own idea."),
      navStep("feedback", "Feedback", "Tell us anything, anytime. We read every single one."),
      {
        popover: {
          title: "That's it \u{1F389}",
          description: "Go get your shit together. You've got this.",
        },
      },
    ],
    onDestroyed: () => {
      try {
        localStorage.setItem(TOUR_KEY, "1");
      } catch {
        // ignore storage failures
      }
    },
  });
  tour.drive();
}

/**
 * First-login product tour. Auto-runs once on the /today page (after onboarding),
 * and can be replayed anywhere by dispatching a "start-tour" window event.
 */
export function ProductTour({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    window.addEventListener("start-tour", runTour);

    let timer: ReturnType<typeof setTimeout> | undefined;
    let alreadyDone = true;
    try {
      alreadyDone = localStorage.getItem(TOUR_KEY) === "1";
    } catch {
      alreadyDone = true;
    }
    if (enabled && pathname === "/today" && !alreadyDone) {
      // Let the page settle so the highlighted elements are mounted.
      timer = setTimeout(runTour, 800);
    }

    return () => {
      window.removeEventListener("start-tour", runTour);
      if (timer) clearTimeout(timer);
    };
  }, [enabled, pathname]);

  return null;
}
