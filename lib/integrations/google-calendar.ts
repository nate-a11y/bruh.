import { createClient } from "@/lib/supabase/server";

// Google OAuth endpoints
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// Remove trailing slash from app URL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

// Scopes needed for calendar access
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
}

export interface Calendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

/**
 * Generate the Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${APP_URL}/api/integrations/google/callback`;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent", // Force consent to get refresh token
    ...(state && { state }),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${APP_URL}/api/integrations/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  return response.json();
}

/**
 * Get user info from Google
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  return response.json();
}

/**
 * Get valid access token, refreshing if needed
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from("zeroed_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .single();

  if (!integration) {
    return null;
  }

  // Check if token is expired (with 5 min buffer)
  // If token_expires_at is null, treat as expired
  if (!integration.token_expires_at) {
    if (!integration.refresh_token) {
      return null;
    }
    // Try to refresh
    try {
      const tokens = await refreshAccessToken(integration.refresh_token);
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await supabase
        .from("zeroed_integrations")
        .update({
          access_token: tokens.access_token,
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      return tokens.access_token;
    } catch {
      return null;
    }
  }

  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    // Token expired or expiring soon, refresh it
    if (!integration.refresh_token) {
      return null;
    }

    try {
      const tokens = await refreshAccessToken(integration.refresh_token);
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await supabase
        .from("zeroed_integrations")
        .update({
          access_token: tokens.access_token,
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      return tokens.access_token;
    } catch {
      return null;
    }
  }

  return integration.access_token;
}

/**
 * List user's calendars
 */
export async function listCalendars(accessToken: string): Promise<Calendar[]> {
  const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to list calendars");
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEvent
): Promise<CalendarEvent> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create event: ${error}`);
  }

  return response.json();
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update event");
  }

  return response.json();
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete event");
  }
}

/**
 * Convert a task to a calendar event
 */
export function taskToCalendarEvent(task: {
  title: string;
  notes?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  estimated_minutes?: number;
}): CalendarEvent {
  const hasTime = task.due_time && task.due_date;
  const duration = task.estimated_minutes || 30;

  if (hasTime) {
    // Timed event
    const startDateTime = `${task.due_date}T${task.due_time}:00`;
    const endDate = new Date(startDateTime);
    endDate.setMinutes(endDate.getMinutes() + duration);

    return {
      summary: task.title,
      description: task.notes || undefined,
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  } else if (task.due_date) {
    // All-day event
    return {
      summary: task.title,
      description: task.notes || undefined,
      start: { date: task.due_date },
      end: { date: task.due_date },
    };
  }

  throw new Error("Task must have a due date to create calendar event");
}

/**
 * List events from calendar (for bidirectional sync)
 */
export async function listCalendarEvents(
  accessToken: string,
  calendarId: string,
  options?: {
    updatedMin?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    maxResults: String(options?.maxResults || 100),
    singleEvents: "true",
    orderBy: "updated",
  });

  if (options?.updatedMin) {
    params.set("updatedMin", options.updatedMin);
  }
  if (options?.timeMin) {
    params.set("timeMin", options.timeMin);
  }
  if (options?.timeMax) {
    params.set("timeMax", options.timeMax);
  }

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to list events");
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Pull changes from Google Calendar and update Bruh tasks
 */
export async function pullChangesFromCalendar(userId: string): Promise<{ updated: number; created: number }> {
  const supabase = await createClient();

  const { data: integrationData } = await supabase
    .from("zeroed_integrations")
    .select("access_token, settings, sync_enabled, last_sync_at, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .single();

  if (!integrationData?.sync_enabled) {
    return { updated: 0, created: 0 };
  }

  // Get valid access token
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return { updated: 0, created: 0 };
  }

  const settings = integrationData.settings as Record<string, unknown> | null;
  const calendarId = (settings?.calendar_id as string) || "primary";
  const lastSyncAt = integrationData.last_sync_at;
  const eventMappings = (settings?.event_mappings as Record<string, string>) || {};

  // Reverse mapping: eventId -> taskId
  const reverseMapping: Record<string, string> = {};
  for (const [taskId, eventId] of Object.entries(eventMappings)) {
    reverseMapping[eventId] = taskId;
  }

  let updated = 0;
  let created = 0;

  try {
    // Get events updated since last sync
    const events = await listCalendarEvents(accessToken, calendarId, {
      updatedMin: lastSyncAt || undefined,
      timeMin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
      timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Next 30 days
    });

    for (const event of events) {
      if (!event.id) continue;

      // Extract event data
      const title = event.summary || "Untitled";
      const description = event.description || null;

      // Get date from event
      let dueDate: string | null = null;
      let dueTime: string | null = null;

      if (event.start?.date) {
        dueDate = event.start.date;
      } else if (event.start?.dateTime) {
        const dt = new Date(event.start.dateTime);
        dueDate = dt.toISOString().split("T")[0];
        dueTime = dt.toTimeString().slice(0, 5);
      }

      // Check if we have a mapping for this event
      const existingTaskId = reverseMapping[event.id];

      if (existingTaskId) {
        // Update existing task
        const { error } = await supabase
          .from("zeroed_tasks")
          .update({
            title,
            notes: description,
            due_date: dueDate,
            due_time: dueTime,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTaskId)
          .eq("user_id", userId);

        if (!error) updated++;
      } else if (dueDate) {
        // Get user's default list (Inbox or first list)
        const { data: defaultList } = await supabase
          .from("zeroed_lists")
          .select("id")
          .eq("user_id", userId)
          .or("name.eq.Inbox,is_default.eq.true")
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (!defaultList) continue;

        // Create new task from calendar event (only if it has a date)
        const { data: newTask, error } = await supabase
          .from("zeroed_tasks")
          .insert({
            user_id: userId,
            list_id: defaultList.id,
            title,
            notes: description,
            due_date: dueDate,
            due_time: dueTime,
            status: "pending",
          })
          .select("id")
          .single();

        if (!error && newTask) {
          // Store the mapping
          const currentMappings = { ...eventMappings, [newTask.id]: event.id };
          await supabase
            .from("zeroed_integrations")
            .update({
              settings: { ...settings, event_mappings: currentMappings },
            })
            .eq("user_id", userId)
            .eq("provider", "google_calendar");
          created++;
        }
      }
    }

    // Update last_sync_at
    await supabase
      .from("zeroed_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", "google_calendar");

    console.log(`Calendar sync: updated ${updated}, created ${created} tasks`);
  } catch (error) {
    console.error("Failed to pull changes from Calendar:", error);
  }

  return { updated, created };
}
