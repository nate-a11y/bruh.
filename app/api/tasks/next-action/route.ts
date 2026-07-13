import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pickNextAction } from "@/lib/ai/next-action";

/**
 * The task-paralysis breaker: picks the single best next task to do and a tiny
 * first step. Free for all signed-in users — it's the ADHD hook.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tasks } = await supabase
    .from("zeroed_tasks")
    .select("id, title, priority, due_date, estimated_minutes, notes")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("due_date", { ascending: true })
    .limit(40);

  const next = await pickNextAction(tasks || []);
  return NextResponse.json({ next });
}
