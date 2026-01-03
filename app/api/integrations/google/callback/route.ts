import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  listCalendars,
} from "@/lib/integrations/google-calendar";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle OAuth errors
  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/settings?error=google_auth_denied`, baseUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/settings?error=invalid_oauth_response`, baseUrl)
    );
  }

  try {
    // Verify state and get user ID
    const stateData = JSON.parse(Buffer.from(state, "base64").toString());
    const stateUserId = stateData.userId;

    // Verify user is still logged in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== stateUserId) {
      return NextResponse.redirect(
        new URL(`/settings?error=session_mismatch`, baseUrl)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    // Get user's calendars to find primary
    const calendars = await listCalendars(tokens.access_token);
    const primaryCalendar = calendars.find((c) => c.primary) || calendars[0];

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store integration in database
    const { error: dbError } = await supabase
      .from("zeroed_integrations")
      .upsert({
        user_id: user.id,
        provider: "google_calendar",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        provider_user_id: googleUser.id,
        provider_email: googleUser.email,
        settings: {
          calendar_id: primaryCalendar?.id || "primary",
          calendar_name: primaryCalendar?.summary || "Primary",
          sync_tasks_to_calendar: true,
          sync_completed_tasks: false,
        },
        sync_enabled: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider",
      });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.redirect(
        new URL(`/settings?error=save_failed`, baseUrl)
      );
    }

    // Success!
    return NextResponse.redirect(
      new URL(`/settings?success=google_connected`, baseUrl)
    );
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(
      new URL(`/settings?error=google_callback_failed`, baseUrl)
    );
  }
}
