"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Settings, Users, Trash2, UserMinus } from "lucide-react";
import Link from "next/link";
import { TeamBilling } from "@/components/teams/team-billing";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  joined_at: string;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  subscription_status?: string;
}

export default function TeamSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadTeam();
  }, [slug]);

  async function loadTeam() {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setCurrentUserId(user.id);

    const { data: teamData } = await supabase
      .from("zeroed_teams")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!teamData) {
      router.push("/teams");
      return;
    }

    setTeam(teamData);
    setName(teamData.name);
    setDescription(teamData.description || "");

    // Get members
    const { data: membersData } = await supabase
      .from("zeroed_team_members")
      .select("*")
      .eq("team_id", teamData.id)
      .order("joined_at", { ascending: true });

    setMembers(membersData || []);

    // Get current user's role
    const currentMember = membersData?.find((m: TeamMember) => m.user_id === user.id);
    setUserRole(currentMember?.role || null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!team || !name.trim()) return;

    setIsSaving(true);

    try {
      const supabase = createClient() as any;

      const { error } = await supabase
        .from("zeroed_teams")
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq("id", team.id);

      if (error) throw error;

      toast.success("Team settings saved");
      setTeam({ ...team, name: name.trim(), description: description.trim() || null });
    } catch (error) {
      console.error("Error saving team:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveMember(memberId: string, memberUserId: string) {
    if (!team) return;

    if (memberUserId === team.owner_id) {
      toast.error("Cannot remove the team owner");
      return;
    }

    try {
      const supabase = createClient() as any;

      const { error } = await supabase
        .from("zeroed_team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setMembers(members.filter(m => m.id !== memberId));
      toast.success("Member removed");
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  }

  async function handleUpdateRole(memberId: string, newRole: string) {
    try {
      const supabase = createClient() as any;

      const { error } = await supabase
        .from("zeroed_team_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      setMembers(members.map(m =>
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      toast.success("Role updated");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  }

  async function handleDeleteTeam() {
    if (!team) return;

    setIsDeleting(true);

    try {
      const supabase = createClient() as any;

      const { error } = await supabase
        .from("zeroed_teams")
        .delete()
        .eq("id", team.id);

      if (error) throw error;

      toast.success("Team deleted");
      router.push("/teams");
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Failed to delete team");
      setIsDeleting(false);
    }
  }

  if (!team || !userRole) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Team Settings" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  const isOwner = userRole === "owner";
  const isAdmin = userRole === "admin" || isOwner;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Team Settings"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/teams/${slug}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>General</CardTitle>
                  <CardDescription>Basic team information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isAdmin || isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    disabled={!isAdmin || isSaving}
                  />
                </div>

                {isAdmin && (
                  <Button type="submit" disabled={isSaving || !name.trim()}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>Members</CardTitle>
                    <CardDescription>{members.length} members</CardDescription>
                  </div>
                </div>
                {isAdmin && (
                  <Button asChild>
                    <Link href={`/teams/${slug}/invite`}>Invite</Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {(member.display_name || member.user_id).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.display_name || member.user_id.slice(0, 8)}
                          {member.user_id === currentUserId && " (you)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && member.role !== "owner" ? (
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleUpdateRole(member.id, v)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="capitalize">
                          {member.role}
                        </Badge>
                      )}

                      {isAdmin && member.user_id !== team.owner_id && member.user_id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Billing */}
          {team && (
            <TeamBilling
              teamId={team.id}
              isOwner={isOwner}
              subscriptionStatus={team.subscription_status || "inactive"}
              memberCount={members.length}
            />
          )}

          {/* Danger Zone */}
          {isOwner && (
            <Card className="border-destructive">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Team</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {team.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the team, all projects, tasks, and remove all members.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteTeam}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Delete Team"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
