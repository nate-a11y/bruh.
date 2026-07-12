import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { lookup } from "dns/promises";
import { isIP } from "net";
import type { WebhookEventType, OutgoingWebhook } from "@/lib/supabase/types";

/** True for loopback, private, link-local (incl. cloud metadata 169.254.169.254) and reserved ranges. */
function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local + metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    return false;
  }
  const a = ip.toLowerCase();
  if (a === "::1" || a === "::") return true;
  if (a.startsWith("fe80") || a.startsWith("fc") || a.startsWith("fd")) return true;
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  return false;
}

/**
 * Guard against SSRF: only allow http(s) to public hosts. Resolves DNS and
 * rejects if any resolved address is private/loopback/link-local. Throws on
 * any unsafe URL. Callers must also use `redirect: "error"` on the fetch.
 */
async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid webhook URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Webhook URL must use http(s)");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost") throw new Error("Webhook host not allowed");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("Webhook host not allowed");
    return;
  }
  const addrs = await lookup(host, { all: true });
  if (addrs.some((a) => isPrivateAddress(a.address))) {
    throw new Error("Webhook host not allowed");
  }
}

// Generate a secure API key
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `bruh_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

// Generate webhook secret
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

// Verify API key
export async function verifyApiKey(apiKey: string): Promise<{ valid: boolean; userId?: string }> {
  if (!apiKey || !apiKey.startsWith("bruh_")) {
    return { valid: false };
  }

  const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const supabase = await createClient();

  const { data } = await supabase
    .from("zeroed_api_keys")
    .select("user_id, expires_at")
    .eq("key_hash", hash)
    .single();

  if (!data) {
    return { valid: false };
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false };
  }

  // Update last_used_at
  await supabase
    .from("zeroed_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", hash);

  return { valid: true, userId: data.user_id };
}

// Sign webhook payload
export function signWebhookPayload(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

// Verify incoming webhook signature (from external services)
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300 // 5 minutes
): boolean {
  const parts = signature.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const sig = parts.find((p) => p.startsWith("v1="))?.slice(3);

  if (!timestamp || !sig) {
    return false;
  }

  // Check timestamp is within tolerance
  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > tolerance) {
    return false;
  }

  // Verify signature
  const signaturePayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// Trigger outgoing webhooks for an event
export async function triggerWebhooks(
  userId: string,
  eventType: WebhookEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  // Get active webhooks for this event type
  const { data: webhooks } = await supabase
    .from("zeroed_outgoing_webhooks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .contains("events", [eventType]);

  if (!webhooks || webhooks.length === 0) {
    return;
  }

  // Send webhooks in parallel
  const results = await Promise.allSettled(
    webhooks.map((webhook) => sendWebhook(webhook, eventType, payload))
  );

  // Log results
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const webhook = webhooks[i];

    if (result.status === "fulfilled") {
      await supabase.from("zeroed_webhook_logs").insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload,
        response_status: result.value.status,
        response_body: result.value.body?.slice(0, 1000),
        success: result.value.success,
      });

      // Update webhook metadata
      if (result.value.success) {
        await supabase
          .from("zeroed_outgoing_webhooks")
          .update({
            last_triggered_at: new Date().toISOString(),
            failure_count: 0,
          })
          .eq("id", webhook.id);
      } else {
        await supabase
          .from("zeroed_outgoing_webhooks")
          .update({
            failure_count: webhook.failure_count + 1,
            // Disable after 10 consecutive failures
            is_active: webhook.failure_count < 9,
          })
          .eq("id", webhook.id);
      }
    } else {
      await supabase.from("zeroed_webhook_logs").insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload,
        response_status: null,
        response_body: result.reason?.message || "Unknown error",
        success: false,
      });
    }
  }
}

async function sendWebhook(
  webhook: OutgoingWebhook,
  eventType: WebhookEventType,
  payload: Record<string, unknown>
): Promise<{ success: boolean; status: number; body: string }> {
  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const signature = signWebhookPayload(body, webhook.secret);

  // SSRF guard: reject internal/private targets before making the request.
  await assertSafeWebhookUrl(webhook.url);

  const response = await fetch(webhook.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bruh-Signature": signature,
      "X-Bruh-Event": eventType,
    },
    body,
    redirect: "error", // don't follow redirects to a private host
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  const responseBody = await response.text();

  return {
    success: response.ok,
    status: response.status,
    body: responseBody,
  };
}

// Webhook event types with descriptions
export const WEBHOOK_EVENTS: Record<WebhookEventType, { label: string; description: string }> = {
  "task.created": {
    label: "Task Created",
    description: "When a new task is created",
  },
  "task.updated": {
    label: "Task Updated",
    description: "When a task is modified",
  },
  "task.completed": {
    label: "Task Completed",
    description: "When a task is marked complete",
  },
  "task.deleted": {
    label: "Task Deleted",
    description: "When a task is deleted",
  },
  "list.created": {
    label: "List Created",
    description: "When a new list is created",
  },
  "list.updated": {
    label: "List Updated",
    description: "When a list is modified",
  },
  "focus.started": {
    label: "Focus Session Started",
    description: "When a focus session begins",
  },
  "focus.completed": {
    label: "Focus Session Completed",
    description: "When a focus session ends",
  },
  "habit.completed": {
    label: "Habit Completed",
    description: "When a habit is marked complete for the day",
  },
  "goal.completed": {
    label: "Goal Achieved",
    description: "When a goal is fully completed",
  },
};
