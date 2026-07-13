"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = "bruh_tour_done_v1";

function runTour() {
  const tour = driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    steps: [
      {
        popover: {
          title: "Welcome to bruh. 👋",
          description:
            "Quick 30-second tour of the good stuff. You can skip anytime with Esc.",
        },
      },
      {
        element: '[data-tour="today"]',
        popover: {
          title: "Today",
          description: "Your day at a glance: what's due, scheduled, and up next.",
        },
      },
      {
        element: '[data-tour="focus"]',
        popover: {
          title: "Focus mode",
          description: "Lock in with a visual timer, ambient sound, and focus music.",
        },
      },
      {
        popover: {
          title: "Brain dump",
          description:
            "Overwhelmed? Press ⌘B (or the mic on Pro), word-vomit everything on your mind, and AI sorts it into clear tasks.",
        },
      },
      {
        element: '[data-tour="roadmap"]',
        popover: {
          title: "Roadmap",
          description: "Vote on what we build next, or suggest your own idea.",
        },
      },
      {
        element: '[data-tour="feedback"]',
        popover: {
          title: "Feedback",
          description: "Tell us anything, anytime. We read every single one.",
        },
      },
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
