import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForToken } from "@/lib/integrations/slack";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle user denying access
    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?error=${error}`, process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?error=missing_params", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Verify state
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/settings?error=invalid_state", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Check state is not too old (10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/settings?error=state_expired", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL("/settings?error=user_mismatch", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(code);

    if (!tokenResponse.ok) {
      console.error("Slack token error:", tokenResponse.error);
      return NextResponse.redirect(
        new URL("/settings?error=token_exchange_failed", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Store the integration
    const { error: dbError } = await supabase.from("zeroed_integrations").upsert(
      {
        user_id: user.id,
        provider: "slack",
        access_token: tokenResponse.access_token,
        provider_user_id: tokenResponse.authed_user.id,
        provider_email: null, // Slack doesn't provide email in OAuth response
        sync_enabled: true,
        settings: {
          team_id: tokenResponse.team.id,
          team_name: tokenResponse.team.name,
          bot_user_id: tokenResponse.bot_user_id,
          slack_user_id: tokenResponse.authed_user.id,
          notify_task_due: true,
          notify_daily_summary: true,
          daily_summary_time: "09:00",
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,provider",
      }
    );

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.redirect(
        new URL("/settings?error=db_error", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    return NextResponse.redirect(
      new URL("/settings?success=slack_connected", process.env.NEXT_PUBLIC_APP_URL)
    );
  } catch (error) {
    console.error("Slack callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=callback_failed", process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}
