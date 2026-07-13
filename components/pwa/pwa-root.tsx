"use client";

import { useServiceWorker } from "@/lib/hooks/use-service-worker";
import { InstallPrompt } from "./install-prompt";

/**
 * App-wide PWA bootstrap, mounted once in the root layout so the whole site
 * (marketing pages and logged-out visitors included) is installable and gets
 * app-shell caching from the service worker.
 *
 * Service worker registration is idempotent, and InstallPrompt guards itself
 * with a module-level singleton, so this stays safe even though the dashboard
 * layout also mounts its own PWA provider for logged-in users.
 */
export function PwaRoot() {
  // Registers /sw.js and wires up update detection.
  useServiceWorker();

  return <InstallPrompt />;
}
