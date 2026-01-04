import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get dependencies for a task
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("task_id");

  if (!taskId) {
    return NextResponse.json({ error: "Task ID required" }, { status: 400 });
  }

  // Get tasks this task depends on (blockers)
  const { data: blockers } = await (supabase as any)
    .from("zeroed_task_dependencies")
    .select(`
      depends_on_id,
      zeroed_tasks!zeroed_task_dependencies_depends_on_id_fkey(
        id, title, status
      )
    `)
    .eq("task_id", taskId);

  // Get tasks that depend on this task (blocking)
  const { data: blocking } = await (supabase as any)
    .from("zeroed_task_dependencies")
    .select(`
      task_id,
      zeroed_tasks!zeroed_task_dependencies_task_id_fkey(
        id, title, status
      )
    `)
    .eq("depends_on_id", taskId);

  return NextResponse.json({
    blockers: blockers?.map((b: any) => b.zeroed_tasks) || [],
    blocking: blocking?.map((b: any) => b.zeroed_tasks) || [],
  });
}

// Add a dependency
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { task_id, depends_on_id } = body;

  if (!task_id || !depends_on_id) {
    return NextResponse.json(
      { error: "task_id and depends_on_id are required" },
      { status: 400 }
    );
  }

  if (task_id === depends_on_id) {
    return NextResponse.json(
      { error: "A task cannot depend on itself" },
      { status: 400 }
    );
  }

  // Verify both tasks belong to user
  const { data: tasks } = await supabase
    .from("zeroed_tasks")
    .select("id")
    .eq("user_id", user.id)
    .in("id", [task_id, depends_on_id]);

  if (!tasks || tasks.length !== 2) {
    return NextResponse.json({ error: "Tasks not found" }, { status: 404 });
  }

  // Check for circular dependencies
  const hasCircular = await checkCircularDependency(
    supabase,
    depends_on_id,
    task_id
  );
  if (hasCircular) {
    return NextResponse.json(
      { error: "This would create a circular dependency" },
      { status: 400 }
    );
  }

  const { error } = await (supabase as any)
    .from("zeroed_task_dependencies")
    .insert({ task_id, depends_on_id });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Dependency already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Remove a dependency
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("task_id");
  const dependsOnId = searchParams.get("depends_on_id");

  if (!taskId || !dependsOnId) {
    return NextResponse.json(
      { error: "task_id and depends_on_id required" },
      { status: 400 }
    );
  }

  const { error } = await (supabase as any)
    .from("zeroed_task_dependencies")
    .delete()
    .eq("task_id", taskId)
    .eq("depends_on_id", dependsOnId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Helper to check for circular dependencies
async function checkCircularDependency(
  supabase: any,
  fromTaskId: string,
  toTaskId: string,
  visited = new Set<string>()
): Promise<boolean> {
  if (fromTaskId === toTaskId) return true;
  if (visited.has(fromTaskId)) return false;

  visited.add(fromTaskId);

  const { data: deps } = await supabase
    .from("zeroed_task_dependencies")
    .select("depends_on_id")
    .eq("task_id", fromTaskId);

  if (!deps) return false;

  for (const dep of deps) {
    if (await checkCircularDependency(supabase, dep.depends_on_id, toTaskId, visited)) {
      return true;
    }
  }

  return false;
}
