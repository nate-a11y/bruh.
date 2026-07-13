import { track } from "@vercel/analytics";

/**
 * Thin, crash-safe wrapper over Vercel Analytics custom events. Use for
 * conversion/funnel events (checkout started, signup, feature used). No-ops if
 * analytics isn't available (SSR, blocked, etc.).
 */
export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean | null>
) {
  try {
    track(name, props);
  } catch {
    // analytics is best-effort; never break the app over it
  }
}
