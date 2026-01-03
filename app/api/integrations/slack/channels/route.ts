import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listChannels } from "@/lib/integrations/slack";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get Slack integration
  const { data: integration } = await supabase
    .from("zeroed_integrations")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("provider", "slack")
    .single();

  if (!integration?.access_token) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 400 });
  }

  try {
    const result = await listChannels(integration.access_token);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Sort channels: public first, then alphabetically
    const channels = (result.channels || []).sort((a, b) => {
      if (a.is_private !== b.is_private) {
        return a.is_private ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Failed to fetch Slack channels:", error);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}
