import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/lib/integrations/google-calendar";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
    }

    // Generate OAuth URL with user ID as state for security
    const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64");
    const authUrl = getGoogleAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Google connect error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=google_connect_failed", process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}
