import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Start a new activity session
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { activity_type, title, task_id } = body;

  // End any existing active sessions first
  await (supabase as any)
    .from("zeroed_activity_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_minutes: 0, // Will be calculated
    })
    .eq("user_id", user.id)
    .is("ended_at", null);

  // Create new session
  const { data, error } = await (supabase as any)
    .from("zeroed_activity_sessions")
    .insert({
      user_id: user.id,
      activity_type: activity_type || "focus",
      title,
      task_id,
      is_productive: activity_type !== "break",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

// End an activity session
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { session_id, notes } = body;

  // Get the session
  const { data: session } = await (supabase as any)
    .from("zeroed_activity_sessions")
    .select("*")
    .eq("id", session_id)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Calculate duration
  const startedAt = new Date(session.started_at);
  const endedAt = new Date();
  const durationMinutes = Math.round(
    (endedAt.getTime() - startedAt.getTime()) / 60000
  );

  // Update session
  const { error } = await (supabase as any)
    .from("zeroed_activity_sessions")
    .update({
      ended_at: endedAt.toISOString(),
      duration_minutes: durationMinutes,
      notes,
    })
    .eq("id", session_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, duration_minutes: durationMinutes });
}

// Get today's activity sessions
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: sessions, error } = await (supabase as any)
    .from("zeroed_activity_sessions")
    .select("*")
    .eq("user_id", user.id)
    .gte("started_at", today.toISOString())
    .order("started_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check for active session
  const activeSession = sessions?.find((s: any) => !s.ended_at);

  return NextResponse.json({
    sessions: sessions || [],
    activeSession: activeSession || null,
  });
}
