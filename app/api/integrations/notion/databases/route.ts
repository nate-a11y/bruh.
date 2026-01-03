import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchDatabases } from "@/lib/integrations/notion";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get Notion integration
  const { data: integration } = await supabase
    .from("zeroed_integrations")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("provider", "notion")
    .single();

  if (!integration?.access_token) {
    return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
  }

  try {
    const result = await searchDatabases(integration.access_token);

    // Map to simpler format
    const databases = result.results.map((db: {
      id: string;
      title?: Array<{ plain_text: string }>;
      icon?: { type: string; emoji?: string } | null;
    }) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || "Untitled",
      icon: db.icon?.type === "emoji" ? db.icon.emoji : "📄",
    }));

    return NextResponse.json({ databases });
  } catch (error) {
    console.error("Failed to fetch Notion databases:", error);
    return NextResponse.json({ error: "Failed to fetch databases" }, { status: 500 });
  }
}
