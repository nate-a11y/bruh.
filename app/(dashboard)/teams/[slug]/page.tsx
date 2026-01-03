import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { TeamDashboard } from "@/components/teams/team-dashboard";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import Link from "next/link";

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  // Use 'as any' to bypass type checking for team tables
  // Types will be regenerated after migration is applied
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch team by slug
  const { data: team } = await supabase
    .from("zeroed_teams")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!team) {
    notFound();
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from("zeroed_team_members")
    .select("role")
    .eq("team_id", team.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  const memberRole = membership.role;
  const isAdmin = memberRole === "admin" || memberRole === "owner";

  // Fetch team members
  const { data: members } = await supabase
    .from("zeroed_team_members")
    .select(`
      id,
      user_id,
      role,
      joined_at
    `)
    .eq("team_id", team.id);

  // Build dashboard data
  const dashboardTeam = {
    id: team.id,
    name: team.name,
    slug: team.slug,
    description: team.description,
    avatar_url: team.avatar_url,
  };

  const dashboardMembers = (members || []).map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    display_name: null,
    role: m.role,
  }));

  return (
    <div className="flex flex-col h-full">
      <Header
        title={team.name}
        action={
          isAdmin ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/teams/${slug}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <TeamDashboard
          team={dashboardTeam}
          members={dashboardMembers}
          projects={[]}
          recentTasks={[]}
          stats={{
            totalTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            totalHours: 0,
          }}
          userRole={memberRole}
        />
      </div>
    </div>
  );
}
