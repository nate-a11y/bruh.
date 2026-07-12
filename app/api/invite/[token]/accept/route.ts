import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { syncTeamSeats } from "@/lib/teams/billing";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { token } = await params;
    const supabase = await createClient() as any;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch invitation
    const { data: invitation } = await supabase
      .from("zeroed_team_invitations")
      .select("id, team_id, role, expires_at, accepted_at, invited_by")
      .eq("token", token)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    }

    if (invitation.accepted_at) {
      return NextResponse.json({ error: "Invitation already accepted" }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("zeroed_team_members")
      .select("id")
      .eq("team_id", invitation.team_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      // Mark invitation as accepted anyway
      await supabase
        .from("zeroed_team_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return NextResponse.json({
        success: true,
        message: "You're already a member of this team"
      });
    }

    // Add user to team
    const { error: memberError } = await supabase
      .from("zeroed_team_members")
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.invited_by,
      });

    if (memberError) {
      console.error("Member insert error:", memberError);
      return NextResponse.json(
        { error: "Failed to join team" },
        { status: 500 }
      );
    }

    // Mark invitation as accepted
    await supabase
      .from("zeroed_team_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    // Keep the team's Stripe seat count in sync (no-op if no active sub).
    try {
      await syncTeamSeats(invitation.team_id);
    } catch (e) {
      console.error("Seat sync after join failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
