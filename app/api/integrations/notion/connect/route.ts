import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSubscriptionAccess } from "@/lib/subscriptions";
import { isPro } from "@/lib/plans";
import { getNotionAuthUrl } from "@/lib/integrations/notion";
import { randomBytes } from "crypto";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Integrations are a Pro feature. Gate server-side, fail closed.
  const access = await checkSubscriptionAccess(user.id);
  if (!isPro(access)) {
    return NextResponse.redirect(new URL("/pricing", process.env.NEXT_PUBLIC_APP_URL));
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
