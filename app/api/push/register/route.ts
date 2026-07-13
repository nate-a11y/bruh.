import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Store a native device's Expo push token so the backend can send remote
// notifications (task reminders, coach nudges) later. Authenticated via the
// native app's Supabase access token (Bearer), same pattern as /api/brain-dump.
// Additive; nothing on the web sends yet (that's a follow-up in the cron jobs).
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { expoPushToken?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const expoPushToken = (body.expoPushToken ?? "").trim() || null;

  // Upsert the token onto the user's preferences row (RLS scopes to them).
  const { error } = await supabase
    .from("zeroed_user_preferences")
    .update({ expo_push_token: expoPushToken })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
