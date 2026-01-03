import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWebhookSecret, WEBHOOK_EVENTS } from "@/lib/webhooks";
import type { WebhookEventType } from "@/lib/supabase/types";

// GET /api/webhooks/outgoing - List outgoing webhooks
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: webhooks } = await supabase
      .from("zeroed_outgoing_webhooks")
      .select("id, name, url, events, is_active, last_triggered_at, failure_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      webhooks: webhooks || [],
      available_events: WEBHOOK_EVENTS,
    });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/webhooks/outgoing - Create outgoing webhook
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, events } = body;

    if (!name || !url || !events || events.length === 0) {
      return NextResponse.json(
        { error: "Name, URL, and at least one event are required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Validate events
    const validEvents = Object.keys(WEBHOOK_EVENTS);
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(", ")}` },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = generateWebhookSecret();

    const { data, error } = await supabase
      .from("zeroed_outgoing_webhooks")
      .insert({
        user_id: user.id,
        name,
        url,
        secret,
        events: events as WebhookEventType[],
        is_active: true,
        failure_count: 0,
      })
      .select("id, name, url, events, is_active, created_at")
      .single();

    if (error) {
      console.error("Error creating webhook:", error);
      return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
    }

    return NextResponse.json({
      webhook: {
        ...data,
        secret, // Only shown on creation
      },
      warning: "Save this signing secret now - you won't be able to see it again!",
    });
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/webhooks/outgoing - Update webhook
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, url, events, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) {
      try {
        new URL(url);
        updates.url = url;
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
    }
    if (events !== undefined) {
      const validEvents = Object.keys(WEBHOOK_EVENTS);
      const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Invalid events: ${invalidEvents.join(", ")}` },
          { status: 400 }
        );
      }
      updates.events = events;
    }
    if (is_active !== undefined) {
      updates.is_active = is_active;
      // Reset failure count when re-enabling
      if (is_active) {
        updates.failure_count = 0;
      }
    }

    const { data, error } = await supabase
      .from("zeroed_outgoing_webhooks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, url, events, is_active, failure_count, last_triggered_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ webhook: data });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/webhooks/outgoing - Delete webhook
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
    }

    // Delete logs first
    await supabase
      .from("zeroed_webhook_logs")
      .delete()
      .eq("webhook_id", webhookId);

    // Delete webhook
    const { error } = await supabase
      .from("zeroed_outgoing_webhooks")
      .delete()
      .eq("id", webhookId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
