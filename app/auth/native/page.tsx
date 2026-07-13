"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Native session bridge. The native app authenticates with Supabase, then loads
// this page inside its WebView with the access + refresh tokens injected (as
// window.__BRUH_TOKENS__ via injectedJavaScriptBeforeContentLoaded, or in the
// URL hash as a fallback). Calling setSession here writes the @supabase/ssr auth
// cookies in the WebView, so the cookie-based web app is authenticated with the
// same session the native app holds. Tokens are read client-side only (never
// sent to the server) and the hash is cleared afterward.
export default function NativeBridge() {
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    (async () => {
      const injected = (window as unknown as {
        __BRUH_TOKENS__?: { access_token?: string; refresh_token?: string };
      }).__BRUH_TOKENS__;

      let accessToken = injected?.access_token;
      let refreshToken = injected?.refresh_token;

      if ((!accessToken || !refreshToken) && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        accessToken = accessToken || params.get("access_token") || undefined;
        refreshToken = refreshToken || params.get("refresh_token") || undefined;
      }

      if (!accessToken || !refreshToken) {
        window.location.replace("/login");
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setStatus("Could not sign you in. Redirecting…");
          window.location.replace("/login");
          return;
        }
        // Mark this WebView session as embedded in the native app so the
        // dashboard renders without its own nav chrome (the native tab bar
        // owns navigation). Readable (not httpOnly) so it round-trips here.
        document.cookie = "bruh_native=1; path=/; max-age=31536000; samesite=lax";
        // Enter the requested route (each native tab bridges into its own path).
        // Only allow same-origin app paths to avoid an open redirect.
        const params = new URLSearchParams(window.location.search);
        const rawNext = params.get("next") || "/today";
        const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/today";
        window.location.replace(next);
      } catch {
        window.location.replace("/login");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="text-2xl font-display font-bold text-foreground">
        bruh<span className="text-primary">.</span>
      </div>
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  );
}
