import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { getPlatformSetting } from "@/lib/platform-settings";

// Lazy initialization - only create client when needed (not at build time)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Record every transactional send so we can prove delivery later (dispute
// evidence, deliverability debugging). Best-effort: never block or fail a send.
async function logEmailSend(opts: {
  to: string | string[];
  subject: string;
  resendId?: string;
  userId?: string;
  emailType?: string;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    const admin = createClient(url, key);
    const recipients = Array.isArray(opts.to) ? opts.to : [opts.to];
    await admin.from("zeroed_email_sends").insert(
      recipients.map((to_email) => ({
        to_email,
        subject: opts.subject,
        resend_id: opts.resendId ?? null,
        user_id: opts.userId ?? null,
        email_type: opts.emailType ?? "transactional",
      }))
    );
  } catch (err) {
    console.error("Failed to log email send:", err);
  }
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "bruh. <noreply@getbruh.app>";
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  bypassSettingsCheck?: boolean; // For critical emails like password reset
  userId?: string; // Recipient's user id, for the delivery log
  emailType?: string; // e.g. "welcome", "receipt", "dunning" — for the delivery log
}

export async function sendEmail({ to, subject, html, text, replyTo, bypassSettingsCheck, userId, emailType }: SendEmailOptions) {
  // Check if email notifications are enabled (unless bypassed for critical emails)
  if (!bypassSettingsCheck) {
    const emailEnabled = await getPlatformSetting("email_notifications");
    if (!emailEnabled) {
      console.log("Email notifications disabled, skipping email send");
      return { success: false, error: "Email notifications disabled" };
    }
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email send");
    return { success: false, error: "Email not configured" };
  }

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || htmlToText(html),
      replyTo,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    await logEmailSend({ to, subject, resendId: data?.id, userId, emailType });
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error("Email send exception:", error);
    return { success: false, error: error.message };
  }
}

// Simple HTML to text conversion
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
