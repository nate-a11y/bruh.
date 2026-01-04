import { Resend } from "resend";
import { getPlatformSetting } from "@/lib/platform-settings";

// Lazy initialization - only create client when needed (not at build time)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
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
}

export async function sendEmail({ to, subject, html, text, replyTo, bypassSettingsCheck }: SendEmailOptions) {
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
