import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return token info
  return NextResponse.json({
    accessToken: session.access_token,
    expiresAt: session.expires_at,
    user: {
      email: session.user.email,
    },
  });
}
