import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, listCalendars } from "@/lib/integrations/google-calendar";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getValidAccessToken(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: "Not connected to Google Calendar" }, { status: 400 });
    }

    const calendars = await listCalendars(accessToken);

    // Map to simpler format and sort with primary first
    const formattedCalendars = calendars
      .filter(cal => cal.id) // Only calendars with IDs
      .map(cal => ({
        id: cal.id,
        name: cal.summary || "Unnamed Calendar",
        primary: cal.primary || false,
        color: cal.backgroundColor || "#4285f4",
      }))
      .sort((a, b) => {
        if (a.primary) return -1;
        if (b.primary) return 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({ calendars: formattedCalendars });
  } catch (error) {
    console.error("Failed to fetch calendars:", error);
    return NextResponse.json({ error: "Failed to fetch calendars" }, { status: 500 });
  }
}
