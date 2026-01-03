"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Insertable } from "@/lib/supabase/types";

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
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Create default Inbox list and user preferences for new users
  if (data.user) {
    const listData: Insertable<"zeroed_lists"> = {
      user_id: data.user.id,
      name: "Inbox",
      color: "#6366f1",
      icon: "inbox",
      position: 0,
    };
    const { error: listError } = await supabase.from("zeroed_lists").insert(listData);

    if (listError) {
      console.error("Failed to create default list:", listError);
    }

    const prefsData: Insertable<"zeroed_user_preferences"> = {
      user_id: data.user.id,
    };
    const { error: prefsError } = await supabase
      .from("zeroed_user_preferences")
      .insert(prefsData);

    if (prefsError) {
      console.error("Failed to create user preferences:", prefsError);
    }
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
