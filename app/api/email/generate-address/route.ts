import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Generate a unique ID for the email address
    const emailTaskId = nanoid(12).toLowerCase();

    // Update user preferences with the new email ID
    const { error } = await supabase
      .from("zeroed_user_preferences")
      .upsert({
        user_id: user.id,
        email_task_id: emailTaskId,
        email_task_enabled: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (error) {
      console.error("Failed to save email ID:", error);
      return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
    }

    return NextResponse.json({
      emailTaskId,
      emailAddress: `task+${emailTaskId}@bruh.app`,
    });
  } catch (error) {
    console.error("Generate email error:", error);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
