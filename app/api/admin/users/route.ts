import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const adminClient = createServiceClient();

  // Fetch users from auth.users table
  const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Fetch user preferences for display names
  const { data: preferences } = await adminClient
    .from("zeroed_user_preferences")
    .select("user_id, display_name, created_at, updated_at");

  // Fetch task counts per user
  const { data: taskCounts } = await adminClient
    .from("zeroed_tasks")
    .select("user_id");

  const taskCountMap = new Map<string, number>();
  taskCounts?.forEach((task) => {
    taskCountMap.set(task.user_id, (taskCountMap.get(task.user_id) || 0) + 1);
  });

  const prefsMap = new Map(preferences?.map((p) => [p.user_id, p]) || []);

  const users = authUsers.users.map((authUser) => {
    const prefs = prefsMap.get(authUser.id);
    // banned_until exists in Supabase auth but isn't in the TS types
    const bannedUntil = (authUser as unknown as { banned_until?: string }).banned_until;
    return {
      id: authUser.id,
      email: authUser.email,
      display_name: prefs?.display_name || null,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
      task_count: taskCountMap.get(authUser.id) || 0,
      is_banned: bannedUntil ? new Date(bannedUntil) > new Date() : false,
    };
  });

  return NextResponse.json({ users });
}
