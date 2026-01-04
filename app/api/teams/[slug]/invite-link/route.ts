import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { role } = await request.json();

    const supabase = await createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get team and check permissions
    const { data: team } = await supabase
      .from("zeroed_teams")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if user is admin/owner
    const { data: membership } = await supabase
      .from("zeroed_team_members")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create invitation (link invites use placeholder email on our domain)
    const { error: inviteError } = await supabase
      .from("zeroed_team_invitations")
      .insert({
        team_id: team.id,
        email: `link-${token.slice(0, 8)}@invite.getbruh.app`,
        role: role || "member",
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return NextResponse.json(
        { error: "Failed to generate link" },
        { status: 500 }
      );
    }

    const link = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Invite link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
