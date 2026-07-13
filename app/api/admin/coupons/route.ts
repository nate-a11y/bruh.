import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import type { Coupon, CouponType } from "@/lib/supabase/types";

// /api/admin/coupons
//
// Coupon / promo code management for the owner. Admin-gated (isAdmin on the
// authenticated user's email, 403 otherwise) and backed by the service-role
// client, because the zeroed_coupons RLS policy only allows the service role
// to read or write rows.
//
//   GET   list every coupon, newest first
//   POST  create a coupon (validated) with is_active true
//   PATCH toggle is_active for a single code

const COUPON_TYPES: CouponType[] = [
  "free_forever",
  "trial_extension",
  "discount",
];

// Small guard shared by every handler so each verb enforces auth the same way.
// Returns the service-role client on success, or a ready-to-return response.
async function requireAdmin(): Promise<
  { admin: ReturnType<typeof createServiceClient> } | { response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { admin: createServiceClient() };
}

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ("response" in gate) return gate.response;
    const { admin } = gate;

    const { data, error } = (await admin
      .from("zeroed_coupons")
      .select(
        "id, code, description, coupon_type, discount_percent, trial_days_extension, max_uses, current_uses, is_active, expires_at, created_at"
      )
      .order("created_at", { ascending: false })) as {
      data: Coupon[] | null;
      error: { message: string } | null;
    };

    if (error) {
      console.error("Error fetching coupons:", error);
      return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
    }

    return NextResponse.json({ coupons: data || [] });
  } catch (error) {
    console.error("Error in admin coupons GET:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireAdmin();
    if ("response" in gate) return gate.response;
    const { admin } = gate;

    const body = await request.json();
    const rawCode = typeof body.code === "string" ? body.code.trim() : "";
    const couponType = body.coupon_type as CouponType;
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;

    // Code: required, normalized to uppercase for a single canonical form.
    if (!rawCode) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    const code = rawCode.toUpperCase();

    // Type: must be one of the allowed set.
    if (!COUPON_TYPES.includes(couponType)) {
      return NextResponse.json({ error: "Invalid coupon type" }, { status: 400 });
    }

    // Type-specific requirements.
    let discountPercent: number | null = null;
    let trialDaysExtension: number | null = null;

    if (couponType === "discount") {
      const pct = Number(body.discount_percent);
      if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
        return NextResponse.json(
          { error: "Discount requires discount_percent between 1 and 100" },
          { status: 400 }
        );
      }
      discountPercent = pct;
    }

    if (couponType === "trial_extension") {
      const days = Number(body.trial_days_extension);
      if (!Number.isInteger(days) || days <= 0) {
        return NextResponse.json(
          { error: "Trial extension requires trial_days_extension greater than 0" },
          { status: 400 }
        );
      }
      trialDaysExtension = days;
    }

    // Optional max_uses: when provided must be a positive integer.
    let maxUses: number | null = null;
    if (body.max_uses !== undefined && body.max_uses !== null && body.max_uses !== "") {
      const uses = Number(body.max_uses);
      if (!Number.isInteger(uses) || uses < 1) {
        return NextResponse.json(
          { error: "Max uses must be a positive whole number" },
          { status: 400 }
        );
      }
      maxUses = uses;
    }

    // Optional expiry: when provided must be a valid future-parseable date.
    let expiresAt: string | null = null;
    if (body.expires_at) {
      const parsed = new Date(body.expires_at);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
      }
      expiresAt = parsed.toISOString();
    }

    // Guard against duplicate codes before insert so we can return a clear 409.
    // The unique index on code is the real backstop; this is the friendly path.
    const { data: existing } = (await admin
      .from("zeroed_coupons")
      .select("id")
      .ilike("code", code)
      .maybeSingle()) as { data: { id: string } | null };

    if (existing) {
      return NextResponse.json(
        { error: `Coupon code "${code}" already exists` },
        { status: 409 }
      );
    }

    const { data, error } = (await (admin as any)
      .from("zeroed_coupons")
      .insert({
        code,
        description,
        coupon_type: couponType,
        discount_percent: discountPercent,
        trial_days_extension: trialDaysExtension,
        max_uses: maxUses,
        is_active: true,
        expires_at: expiresAt,
      })
      .select(
        "id, code, description, coupon_type, discount_percent, trial_days_extension, max_uses, current_uses, is_active, expires_at, created_at"
      )
      .single()) as { data: Coupon | null; error: { code?: string; message: string } | null };

    if (error) {
      // 23505 is Postgres unique_violation, in case of a race past the check above.
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Coupon code "${code}" already exists` },
          { status: 409 }
        );
      }
      console.error("Error creating coupon:", error);
      return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
    }

    return NextResponse.json({ coupon: data, success: true });
  } catch (error) {
    console.error("Error in admin coupons POST:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireAdmin();
    if ("response" in gate) return gate.response;
    const { admin } = gate;

    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const isActive = body.is_active;

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
    }

    const { data, error } = (await (admin as any)
      .from("zeroed_coupons")
      .update({ is_active: isActive })
      .ilike("code", code)
      .select(
        "id, code, description, coupon_type, discount_percent, trial_days_extension, max_uses, current_uses, is_active, expires_at, created_at"
      )
      .single()) as { data: Coupon | null; error: { message: string } | null };

    if (error || !data) {
      console.error("Error toggling coupon:", error);
      return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
    }

    return NextResponse.json({ coupon: data, success: true });
  } catch (error) {
    console.error("Error in admin coupons PATCH:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
