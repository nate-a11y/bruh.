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
