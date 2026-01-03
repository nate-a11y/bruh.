import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signWebhookPayload } from "@/lib/webhooks";

// POST /api/webhooks/test - Send a test webhook
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { webhook_id } = await request.json();

    if (!webhook_id) {
      return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
    }

    // Get webhook
    const { data: webhook } = await supabase
      .from("zeroed_outgoing_webhooks")
      .select("*")
      .eq("id", webhook_id)
      .eq("user_id", user.id)
      .single();

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Send test payload
    const testPayload = {
      event: "test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook from Bruh",
        webhook_id: webhook.id,
        webhook_name: webhook.name,
      },
    };

    const body = JSON.stringify(testPayload);
    const signature = signWebhookPayload(body, webhook.secret);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bruh-Signature": signature,
        "X-Bruh-Event": "test",
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    const responseBody = await response.text();

    // Log the test
    await supabase.from("zeroed_webhook_logs").insert({
      webhook_id: webhook.id,
      event_type: "task.created", // Using a valid event type for the log
      payload: testPayload,
      response_status: response.status,
      response_body: responseBody.slice(0, 1000),
      success: response.ok,
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        status: response.status,
        message: "Test webhook sent successfully",
      });
    } else {
      return NextResponse.json({
        success: false,
        status: response.status,
        message: `Webhook returned error: ${response.statusText}`,
        body: responseBody.slice(0, 500),
      });
    }
  } catch (error) {
    console.error("Error testing webhook:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to send test webhook",
    });
  }
}
