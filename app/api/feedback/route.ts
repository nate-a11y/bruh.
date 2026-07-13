import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { headers } from "next/headers";

const OWNER_EMAIL = process.env.FEEDBACK_ALERT_EMAIL || "nate@lakeridepros.com";
const CATEGORIES = new Set(["bug", "idea", "other"]);

// POST /api/feedback - store a user's feedback and alert the owner.
export async function POST(request: Request) {
  try {
    const rl = await rateLimit("auth", clientIp(await headers()));
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many submissions. Try again shortly." }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as {
      category?: string;
      message?: string;
      page?: string;
    };
    const message = (body.message || "").trim();
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
    if (message.length > 5000) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }
    const category = CATEGORIES.has(body.category || "") ? body.category! : "other";

    const { error } = await (supabase as any).from("zeroed_feedback").insert({
      user_id: user.id,
      email: user.email,
      category,
      message,
      page: (body.page || "").slice(0, 200) || null,
    });
    if (error) {
      console.error("Feedback insert failed:", error);
      return NextResponse.json({ error: "Could not save feedback" }, { status: 500 });
    }

    // Alert the owner (best-effort, non-blocking of the success response).
    const label = category === "bug" ? "Bug" : category === "idea" ? "Idea" : "Feedback";
    await sendEmail({
      to: OWNER_EMAIL,
      subject: `New bruh. ${label} from ${user.email ?? "a user"}`,
      html: `<p><strong>${label}</strong> from <strong>${user.email ?? user.id}</strong>${
        body.page ? ` (on <code>${body.page}</code>)` : ""
      }:</p><div style="white-space:pre-wrap;padding:12px;border-radius:8px;background:#212121;color:#e5e5e5;">${message.replace(
        /</g,
        "&lt;"
      )}</div>`,
      bypassSettingsCheck: true,
      emailType: "feedback",
    }).catch((e) => console.error("Feedback email failed:", e));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback route error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
