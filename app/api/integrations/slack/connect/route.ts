import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSlackAuthUrl } from "@/lib/integrations/slack";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
    }

    // Generate state parameter to prevent CSRF
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString("base64");

    const authUrl = getSlackAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Slack connect error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=slack_connect_failed", process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}
