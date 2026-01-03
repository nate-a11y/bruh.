import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email_task_enabled } = body;

    const { error } = await supabase
      .from("zeroed_user_preferences")
      .update({
        email_task_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email settings error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
