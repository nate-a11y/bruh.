import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendEmail, taskAssignedEmail } from "@/lib/email";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { taskId } = await params;
    const { assigneeId } = await request.json();

    const supabase = await createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get task with team info
    const { data: task } = await supabase
      .from("zeroed_team_tasks")
      .select(`
        id,
        title,
        team_id,
        project_id,
        zeroed_team_projects (
          name
        ),
        zeroed_teams (
          slug
        )
      `)
      .eq("id", taskId)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if user has permission
    const { data: membership } = await supabase
      .from("zeroed_team_members")
      .select("role")
      .eq("team_id", task.team_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin", "member"].includes(membership.role)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Update task assignee
    const { error: updateError } = await supabase
      .from("zeroed_team_tasks")
      .update({ assignee_id: assigneeId || null })
      .eq("id", taskId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to assign task" },
        { status: 500 }
      );
    }

    // Send notification email if assigning to someone (not unassigning)
    if (assigneeId && assigneeId !== user.id) {
      // Get assignee's email from auth.users (we need service role for this)
      // For now, we'll get it from user_preferences if they have display_name
      const { data: assignee } = await supabase
        .from("zeroed_user_preferences")
        .select("display_name")
        .eq("user_id", assigneeId)
        .single();

      // Get assignee's email (this would normally come from auth.users)
      // For now, skip if we can't get the email
      // In production, use service role or store email in user_preferences

      const taskLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/teams/${task.zeroed_teams?.slug}/projects/${task.project_id}`;

      // Log activity
      await supabase
        .from("zeroed_task_activity")
        .insert({
          task_id: taskId,
          user_id: user.id,
          action: "assigned",
          changes: { assignee_id: assigneeId },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
