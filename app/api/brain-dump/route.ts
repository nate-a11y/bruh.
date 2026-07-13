import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { parseBrainDump } from "@/lib/ai/parse-brain-dump";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Authenticated brain-dump endpoint for the native app. The web uses the
// processBrainDump server action (cookie session); native can't call actions,
// so this mirrors it but authenticates via a Supabase access token in the
// Authorization header (Bearer). Additive — the web dialog is unchanged.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const rl = await rateLimit("ai", clientIp(request.headers));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  // A Supabase client scoped to the caller's token (RLS enforces their rows).
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { text?: string; listId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Enter something to brain-dump." }, { status: 400 });
  }

  // Resolve the target list (given, else the user's Inbox / first list).
  let listId = body.listId;
  if (!listId) {
    const { data: lists } = await supabase
      .from("zeroed_lists")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("position", { ascending: true });
    listId = lists?.find((l) => l.name === "Inbox")?.id ?? lists?.[0]?.id;
  }
  if (!listId) {
    return NextResponse.json({ error: "No list to add tasks to." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = await parseBrainDump(text);
  } catch {
    return NextResponse.json({ error: "Could not parse that. Try again." }, { status: 502 });
  }

  if (!parsed.tasks.length) {
    return NextResponse.json({ error: "No tasks found. Try being more specific." }, { status: 422 });
  }

  const { data: maxPos } = await supabase
    .from("zeroed_tasks")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  let position = (maxPos?.position ?? 0) + 1;
  const created: { id: string; title: string }[] = [];

  for (const task of parsed.tasks) {
    const { data: newTask, error } = await supabase
      .from("zeroed_tasks")
      .insert({
        user_id: user.id,
        list_id: listId,
        title: task.title,
        notes: task.notes || null,
        priority: task.priority || "normal",
        due_date: task.due_date || null,
        estimated_minutes: task.estimated_minutes || 25,
        position: position++,
      })
      .select("id, title")
      .single();
    if (!error && newTask) created.push(newTask);
  }

  return NextResponse.json({ tasks: created, count: created.length });
}
