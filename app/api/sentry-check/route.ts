import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Health/verification route for Sentry. Passing ?token=bruh-sentry-probe throws
// a deliberate error so we can confirm Sentry is capturing server errors.
export function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== "bruh-sentry-probe") {
    return NextResponse.json({ ok: true, service: "sentry-check" });
  }
  throw new Error("Sentry test error from /api/sentry-check");
}
