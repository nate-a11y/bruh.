import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotionAuthUrl } from "@/lib/integrations/notion";
import { randomBytes } from "crypto";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate state for CSRF protection
  const state = randomBytes(32).toString("hex");

  // Store state in database for CSRF verification during OAuth callback
  // access_token is empty until OAuth completes successfully
  await supabase.from("zeroed_integrations").upsert({
    user_id: user.id,
    provider: "notion",
    access_token: "",
    settings: { oauth_state: state },
    sync_enabled: false,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: "user_id,provider",
  });

  const authUrl = getNotionAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
