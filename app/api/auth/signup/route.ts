import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { recordReferral } from "@/lib/referrals";
import { redeemCoupon, validateCoupon } from "@/lib/subscriptions";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getPlatformSetting } from "@/lib/platform-settings";

// Public signup endpoint for the native app. Mirrors the web signup server
// action (app/(auth)/actions.ts) but returns the Supabase session tokens in the
// body instead of writing SSR cookies, so the native client can setSession into
// AsyncStorage and then bridge into the WebView. The web signup UI is unchanged;
// this is purely additive. Referral attribution comes from an explicit refCode
// in the body (native has no bruh_ref cookie).
export async function POST(request: Request) {
  const rl = await rateLimit("auth", clientIp(request.headers));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  // Respect the platform-wide signups toggle before creating any user.
  const signupsEnabled = await getPlatformSetting("signups_enabled");
  if (!signupsEnabled) {
    return NextResponse.json(
      { error: "Signups are currently disabled." },
      { status: 403 }
    );
  }

  let body: {
    email?: string;
    password?: string;
    couponCode?: string | null;
    acceptedTerms?: boolean;
    refCode?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  const couponCode = (body.couponCode ?? "").trim();
  const refCode = (body.refCode ?? "").trim();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  // Require terms acceptance, same as the web flow.
  if (!body.acceptedTerms) {
    return NextResponse.json(
      { error: "You must accept the Terms of Service and Privacy Policy." },
      { status: 400 }
    );
  }

  // Validate the coupon before creating the user.
  if (couponCode) {
    const validation = await validateCoupon(couponCode);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid or expired coupon code." },
        { status: 400 }
      );
    }
  }

  // Create the user with the service role (auto-confirm email, like the web).
  const adminClient = createServiceClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userId = data.user.id;

  // Apply the coupon if provided (don't fail signup if redemption fails).
  if (couponCode) {
    const result = await redeemCoupon(userId, couponCode);
    if (!result.success) {
      console.error("Coupon redemption failed:", result.message);
    }
  }

  // Attribute the signup to a referrer if a ?ref code was passed through.
  if (refCode) {
    try {
      await recordReferral(adminClient, { code: refCode, referredUserId: userId });
    } catch (err) {
      console.error("Referral capture failed:", err);
    }
  }

  // Send the welcome email (fire and forget).
  const userName = email.split("@")[0];
  const welcomeContent = welcomeEmail({ userName });
  sendEmail({
    to: email,
    subject: welcomeContent.subject,
    html: welcomeContent.html,
    userId,
    emailType: "welcome",
  }).catch((err) => console.error("Welcome email failed:", err));

  // Sign in with a cookieless client to mint session tokens for the native app.
  const authClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: signInData, error: signInError } =
    await authClient.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.session) {
    return NextResponse.json(
      { error: signInError?.message ?? "Could not start a session." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  });
}
