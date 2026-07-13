"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ShareWinProps {
  // Real session stats. All optional so the card degrades gracefully.
  minutes?: number;
  sessions?: number;
  streak?: number;
  className?: string;
}

const FALLBACK_LINK = "https://getbruh.app";

// Fetch the caller's referral link so shares feed the acquisition loop.
// Falls back to the plain app URL if the user is not signed in or the
// request fails, so sharing is never blocked.
async function getReferralLink(): Promise<string> {
  try {
    const res = await fetch("/api/referral", { cache: "no-store" });
    if (!res.ok) return FALLBACK_LINK;
    const data = (await res.json()) as { link?: string };
    return data.link || FALLBACK_LINK;
  } catch {
    return FALLBACK_LINK;
  }
}

function buildImageUrl(minutes: number, sessions: number, streak: number): string {
  const params = new URLSearchParams();
  if (minutes > 0) params.set("minutes", String(minutes));
  if (sessions > 0) params.set("sessions", String(sessions));
  if (streak > 0) params.set("streak", String(streak));
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/api/share/win?${params.toString()}`;
}

function buildMessage(minutes: number, sessions: number): string {
  const parts: string[] = [];
  if (minutes > 0) parts.push(`Focused ${minutes}m`);
  if (sessions > 1) parts.push(`across ${sessions} sessions`);
  const body = parts.length > 0 ? parts.join(" ") : "Got a focus session in";
  return `${body} on bruh. Come get your shit together with me:`;
}

export function ShareWin({ minutes = 0, sessions = 0, streak = 0, className }: ShareWinProps) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const link = await getReferralLink();
      const imageUrl = buildImageUrl(minutes, sessions, streak);
      const text = buildMessage(minutes, sessions);

      // Prefer the native share sheet on mobile.
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "My focus win on bruh.", text, url: link });
          return;
        } catch (err) {
          // User dismissed the sheet, or share was not allowed. Fall through
          // to the copy fallback rather than surfacing an error.
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }

      // Desktop fallback: copy the referral link, open the branded card.
      let copied = false;
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(`${text} ${link}`);
          copied = true;
        } catch {
          copied = false;
        }
      }

      if (typeof window !== "undefined") {
        window.open(imageUrl, "_blank", "noopener,noreferrer");
      }

      toast.success(
        copied ? "Link copied. Share your win!" : "Win card opened in a new tab",
        { description: copied ? undefined : "Copy the link to invite a friend." }
      );
    } finally {
      setSharing(false);
    }
  }

  return (
    <Button
      onClick={handleShare}
      disabled={sharing}
      variant="outline"
      className={className}
    >
      <Share2 className="mr-2 h-4 w-4" />
      {sharing ? "Sharing..." : "Share win"}
    </Button>
  );
}
