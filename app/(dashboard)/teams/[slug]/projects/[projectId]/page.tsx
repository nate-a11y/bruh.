import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import Link from "next/link";
import { TeamTaskBoard } from "@/components/teams/team-task-board";

interface ProjectPageProps {
  params: Promise<{ slug: string; projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug, projectId } = await params;
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get team
  const { data: team } = await supabase
    .from("zeroed_teams")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!team) {
    notFound();
  }

  // Check membership
  const { data: membership } = await supabase
    .from("zeroed_team_members")
    .select("role")
    .eq("team_id", team.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Get project
  const { data: project } = await supabase
    .from("zeroed_team_projects")
    .select("*")
    .eq("id", projectId)
    .eq("team_id", team.id)
    .single();

  if (!project) {
    notFound();
  }

  // Get tasks
  const { data: tasks } = await supabase
    .from("zeroed_team_tasks")
    .select(`
      *,
      assignee:assignee_id (
        id,
        email
      ),
      reporter:reporter_id (
        id,
        email
      )
    `)
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  // Get team members for assignment
  const { data: members } = await supabase
    .from("zeroed_team_members")
    .select(`
      user_id,
      role,
      display_name
    `)
    .eq("team_id", team.id);

  const canManage = ["owner", "admin", "member"].includes(membership.role);

  return (
    <div className="flex flex-col h-full">
      <Header
        title={project.name}
        subtitle={project.description}
        action={
          canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/teams/${slug}/projects/${projectId}/settings`}>
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/teams/${slug}/projects/${projectId}/tasks/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-auto">
        <TeamTaskBoard
          teamSlug={slug}
          projectId={projectId}
          tasks={tasks || []}
          members={members || []}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
