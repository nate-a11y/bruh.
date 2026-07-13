import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// GET /api/admin/users/[userId]
//
// Per-user detail drill-down for the admin console. Admin-gated (isAdmin on the
// authenticated user, 403 otherwise) and backed by the service-role client.
// Every query here is READ-ONLY: this route never writes or mutates any row.
//
// Returns a consolidated profile stitched from the auth user plus the app's
// per-user tables (subscription, preferences, task activity, referrals, and
// recent transactional emails).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    const admin = createServiceClient();

    // Auth user: email, timestamps, and ban state. If this fails the user does
    // not exist (or was deleted), so surface a 404.
    const { data: authData, error: authErr } =
      await admin.auth.admin.getUserById(userId);
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const authUser = authData.user;
    const bannedUntil = (authUser as { banned_until?: string | null })
      .banned_until;
    const suspended = Boolean(
      bannedUntil && new Date(bannedUntil).getTime() > Date.now()
    );

    // Subscription (one row per user).
    const { data: subscription } = (await (admin as any)
      .from("zeroed_subscriptions")
      .select(
        "status, trial_ends_at, current_period_end, stripe_customer_id, cancel_at_period_end"
      )
      .eq("user_id", userId)
      .maybeSingle()) as {
      data: {
        status: string;
        trial_ends_at: string | null;
        current_period_end: string | null;
        stripe_customer_id: string | null;
        cancel_at_period_end: boolean | null;
      } | null;
    };

    // Preferences (display name + referral code).
    const { data: prefs } = (await admin
      .from("zeroed_user_preferences")
      .select("display_name, referral_code")
      .eq("user_id", userId)
      .maybeSingle()) as {
      data: { display_name: string | null; referral_code: string | null } | null;
    };

    // Task activity: total count + most recent task timestamp.
    const { count: taskCount } = await admin
      .from("zeroed_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: lastTask } = (await admin
      .from("zeroed_tasks")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as { data: { created_at: string | null } | null };

    // Referrals this user has made (as referrer): total invited + converted.
    const { data: referralsMade } = (await (admin as any)
      .from("zeroed_referrals")
      .select("status")
      .eq("referrer_user_id", userId)) as {
      data: Array<{ status: string | null }> | null;
    };
    const invited = referralsMade?.length || 0;
    const converted = (referralsMade || []).filter(
      (r) => r.status === "converted"
    ).length;

    // Whether this user was themselves referred by someone.
    const { data: referredRow } = (await (admin as any)
      .from("zeroed_referrals")
      .select("referrer_user_id")
      .eq("referred_user_id", userId)
      .maybeSingle()) as {
      data: { referrer_user_id: string | null } | null;
    };
    let wasReferredBy: string | null = null;
    if (referredRow?.referrer_user_id) {
      const { data: referrer } = await admin.auth.admin.getUserById(
        referredRow.referrer_user_id
      );
      wasReferredBy = referrer?.user?.email || referredRow.referrer_user_id;
    }

    // Recent transactional emails sent to this user.
    const { data: emails } = (await (admin as any)
      .from("zeroed_email_sends")
      .select("email_type, subject, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)) as {
      data: Array<{
        email_type: string | null;
        subject: string | null;
        created_at: string;
      }> | null;
    };

    return NextResponse.json({
      user: {
        id: authUser.id,
        email: authUser.email || null,
        createdAt: authUser.created_at || null,
        lastSignIn: authUser.last_sign_in_at || null,
        suspended,
      },
      subscription: subscription
        ? {
            status: subscription.status,
            trialEndsAt: subscription.trial_ends_at,
            currentPeriodEnd: subscription.current_period_end,
            stripeCustomerId: subscription.stripe_customer_id,
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
          }
        : null,
      preferences: {
        displayName: prefs?.display_name || null,
        referralCode: prefs?.referral_code || null,
      },
      activity: {
        taskCount: taskCount || 0,
        lastTaskAt: lastTask?.created_at || null,
      },
      referrals: {
        invited,
        converted,
        wasReferredBy,
      },
      recentEmails: (emails || []).map((e) => ({
        type: e.email_type,
        subject: e.subject,
        createdAt: e.created_at,
      })),
    });
  } catch (error) {
    console.error("Error in admin user detail:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Suspend/unsuspend a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const { action } = await request.json();

  const adminClient = createServiceClient();

  if (action === "suspend") {
    // Ban user for 100 years (effectively permanent until manually unbanned)
    const banUntil = new Date();
    banUntil.setFullYear(banUntil.getFullYear() + 100);

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: "876000h", // ~100 years in hours
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "User suspended" });
  }

  if (action === "unsuspend") {
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "User unsuspended" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const adminClient = createServiceClient();

  // Delete user from auth (this should cascade to other tables via RLS/triggers)
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "User deleted" });
}
