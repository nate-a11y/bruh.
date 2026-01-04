import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Allowed redirect paths (must start with /)
function isValidRedirectPath(path: string): boolean {
  // Must start with / and not contain protocol or double slashes
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  // Block any path that could be interpreted as absolute URL
  if (/^\/[^\/]/.test(path) === false && path !== "/") return false;
  return true;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/today";

  // Validate redirect path to prevent open redirect attacks
  const safePath = isValidRedirectPath(next) ? next : "/today";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
