import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendEmail, teamInviteEmail } from "@/lib/email";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get team and check permissions
    const { data: team } = await supabase
      .from("zeroed_teams")
      .select("id, name")
      .eq("slug", slug)
      .single();

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if user is admin/owner
    const { data: membership } = await supabase
      .from("zeroed_team_members")
      .select("role, display_name")
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

    // Create invitation
    const { error: inviteError } = await supabase
      .from("zeroed_team_invitations")
      .insert({
        team_id: team.id,
        email,
        role,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    // Send invite email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;
    const inviterName = membership.display_name || user.email?.split("@")[0] || "Someone";

    const emailContent = teamInviteEmail({
      teamName: team.name,
      inviterName,
      role,
      inviteLink,
    });

    const emailResult = await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (!emailResult.success) {
      console.warn("Email send failed:", emailResult.error);
      // Don't fail the request - invitation is created, just email failed
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
