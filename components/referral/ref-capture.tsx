"use client";

import { useEffect } from "react";

// Captures a ?ref=CODE query param anywhere on the site into a cookie, so the
// signup flow can attribute the new account to the referrer. Renders nothing.
export function RefCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) {
        // 30 days, root path, lax so it survives the signup navigation.
        document.cookie = `bruh_ref=${encodeURIComponent(
          ref.toUpperCase()
        )}; max-age=${60 * 60 * 24 * 30}; path=/; SameSite=Lax`;
      }
    } catch {
      // Non-fatal: referral capture is best-effort.
    }
  }, []);

  return null;
}
