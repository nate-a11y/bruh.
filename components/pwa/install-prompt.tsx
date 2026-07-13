"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Module-level guard so only one InstallPrompt is ever active, even if the
// component is mounted in more than one place (e.g. the root layout for the
// marketing surface AND the dashboard layout for logged-in users). The
// first instance to mount claims the singleton and renders the banner; any
// other instance stays inert to avoid stacked, duplicate prompts.
let promptClaimed = false;

export function InstallPrompt() {
  // Claim the singleton during the first client render with a lazy initializer
  // (same window-guarded pattern as isInstalled below, so no setState-in-effect
  // and no hydration mismatch: the component renders null on both server and
  // client until a prompt is actually available). The first instance to render
  // wins; the root layout renders before the dashboard layout, so the root one
  // is always primary and the dashboard copy stays inert.
  const [isPrimary] = useState(() => {
    if (typeof window === "undefined") return false;
    if (promptClaimed) return false;
    promptClaimed = true;
    return true;
  });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  // Derive the initial installed state from the display mode with a lazy
  // initializer instead of a setState-in-effect. (First paint always renders
  // null since showPrompt/deferredPrompt are unset, so there's no hydration
  // mismatch.)
  const [isInstalled, setIsInstalled] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(display-mode: standalone)").matches
  );

  useEffect(() => {
    // Only the primary instance runs, and only when not already installed.
    if (!isPrimary || isInstalled) return;

    // Check if user dismissed prompt before
    const dismissed = localStorage.getItem("bruh-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return; // Don't show for 7 days after dismissal
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 30 seconds of use
      setTimeout(() => setShowPrompt(true), 30000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isPrimary, isInstalled]);

  async function handleInstall() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem("bruh-install-dismissed", Date.now().toString());
  }

  if (!isPrimary || isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
      >
        <Card className="shadow-lg border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">Install bruh.</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add to home screen for quick access & offline use
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleInstall}>
                    Install
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDismiss}>
                    Not now
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleDismiss}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
