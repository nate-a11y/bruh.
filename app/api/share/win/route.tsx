import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// ImageResponse renders on the Node runtime by default in Next 16.
// No custom fonts are loaded, so the default system sans is used.
export const runtime = "nodejs";

// Brand palette (matches app/globals.css + components/brand/logo.tsx).
const BG = "#0a0a0a";
const CARD = "#171717";
const ORANGE = "#FF6B00";
const WHITE = "#ffffff";
const MUTED = "#a3a3a3";
const BORDER = "#262626";

// Parse a query param into a safe, non-negative integer for display only.
// The numbers are never trusted for anything but rendering.
function safeInt(value: string | null, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, max);
}

// Warm, ADHD-friendly line that adapts to what the session looked like.
// Kept short so it reads on a single line in the card.
function encouragement(minutes: number, tasks: number): string {
  if (minutes >= 90) return "Serious deep work. Proud of you.";
  if (tasks >= 5) return "Momentum looks good on you.";
  if (minutes >= 45) return "You showed up and stayed with it.";
  if (minutes > 0) return "Small focus, real progress.";
  return "Showing up is the hard part. You did it.";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const minutes = safeInt(searchParams.get("minutes"), 100000);
  // `sessions` is the primary count from the focus flow; `tasks` is accepted
  // as an alias so older share links keep working.
  const count = safeInt(
    searchParams.get("sessions") ?? searchParams.get("tasks"),
    9999
  );
  const streak = safeInt(searchParams.get("streak"), 9999);

  const stats: { value: string; label: string }[] = [];
  if (minutes > 0) stats.push({ value: `${minutes}`, label: "minutes focused" });
  if (count > 0)
    stats.push({ value: `${count}`, label: count === 1 ? "session" : "sessions" });
  if (streak > 0)
    stats.push({ value: `${streak}`, label: streak === 1 ? "day streak" : "day streak" });

  // Always have at least one stat so the card never renders empty.
  if (stats.length === 0) stats.push({ value: "1", label: "focus session" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BG,
          padding: "56px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        {/* Header: wordmark */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: WHITE,
            }}
          >
            bruh
            <span style={{ color: ORANGE }}>.</span>
          </div>
        </div>

        {/* Card body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 28,
            padding: "44px 48px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 600,
              color: ORANGE,
              letterSpacing: "0.01em",
              textTransform: "uppercase",
            }}
          >
            Focus session done
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 44,
              fontWeight: 700,
              color: WHITE,
              lineHeight: 1.1,
              maxWidth: 1040,
            }}
          >
            {encouragement(minutes, count)}
          </div>

          {/* Stat row */}
          <div style={{ display: "flex", gap: 24, marginTop: 36 }}>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 18,
                  padding: "22px 30px",
                  minWidth: 180,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 68,
                    fontWeight: 800,
                    color: WHITE,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 10,
                    fontSize: 22,
                    fontWeight: 500,
                    color: MUTED,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: WHITE }}>
            getbruh.app
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: MUTED }}>
            Get your shit together.
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
