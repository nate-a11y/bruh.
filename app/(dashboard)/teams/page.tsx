import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function TeamsPage() {
  // Use 'as any' to bypass type checking for team tables
  // Types will be regenerated after migration is applied
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch user's teams
  const { data: memberships } = await supabase
    .from("zeroed_team_members")
    .select(`
      role,
      zeroed_teams (
        id,
        name,
        slug,
        description,
        avatar_url
      )
    `)
    .eq("user_id", user.id);

  const teams = (memberships || []).map((m: any) => ({
    ...m.zeroed_teams,
    role: m.role,
  }));

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Teams"
        action={
          <Button asChild>
            <Link href="/teams/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Link>
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl">
          {teams.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Create a team to collaborate with others on tasks and projects.
                  Share workloads, assign tasks, and track progress together.
                </p>
                <Button asChild>
                  <Link href="/teams/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Team
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teams.map((team: any) => (
                <Link key={team.id} href={`/teams/${team.slug}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                    <CardHeader className="flex flex-row items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={team.avatar_url || undefined} />
                        <AvatarFallback>
                          {team.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <Badge variant="secondary" className="capitalize">
                            {team.role}
                          </Badge>
                        </div>
                        {team.description && (
                          <CardDescription className="line-clamp-2">
                            {team.description}
                          </CardDescription>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-end text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        Open <ArrowRight className="h-4 w-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
