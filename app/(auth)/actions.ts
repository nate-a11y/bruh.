"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { redeemCoupon, validateCoupon } from "@/lib/subscriptions";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const couponCode = formData.get("couponCode") as string | null;
  const acceptedTerms = formData.get("acceptedTerms") === "on";

  // Require terms acceptance
  if (!acceptedTerms) {
    return { error: "You must accept the Terms of Service and Privacy Policy" };
  }

  // Validate coupon code if provided (before creating user)
  if (couponCode && couponCode.trim()) {
    const validation = await validateCoupon(couponCode.trim());
    if (!validation.valid) {
      return { error: "Invalid or expired coupon code" };
    }
  }

  // Use admin API to create user (bypasses GoTrue's normal flow)
  const adminClient = createServiceClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
  });

  if (error) {
    return { error: error.message };
  }

  const userId = data.user.id;

  // Apply coupon code if provided
  if (couponCode && couponCode.trim()) {
    const result = await redeemCoupon(userId, couponCode.trim());
    if (!result.success) {
      console.error("Coupon redemption failed:", result.message);
      // Don't fail signup, just log it - user can apply later
    }
  }

  // Send welcome email (don't await - fire and forget)
  const userName = email.split("@")[0];
  const welcomeContent = welcomeEmail({ userName });
  sendEmail({
    to: email,
    subject: welcomeContent.subject,
    html: welcomeContent.html,
  }).catch((err) => console.error("Welcome email failed:", err));

  // Now sign in the user
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithMagicLink(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Check your email for the magic link!" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
