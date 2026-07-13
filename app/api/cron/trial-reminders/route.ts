import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, trialEndingEmail } from "@/lib/email";

// Trial-ending reminder cron. Runs daily and nudges trialing users toward paid
// as their 30-day Pro trial winds down: once ~3 days out, then once ~1 day out.
// Dedup is via zeroed_subscriptions.trial_reminder_stage (0=none, 1=3-day sent,
// 2=1-day sent) so a user is emailed at most once per threshold. Reminders are
// transactional (a heads-up about their account), so they bypass the
// notification-preference toggle.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// How many days out each reminder fires, and the stage it advances the row to.
const THREE_DAY_THRESHOLD = 3;
const ONE_DAY_THRESHOLD = 1;
const STAGE_THREE_DAY = 1;
const STAGE_ONE_DAY = 2;

const UPGRADE_URL = `${process.env.NEXT_PUBLIC_APP_URL || "https://getbruh.app"}/pricing`;

type TrialRow = {
  user_id: string | null;
  trial_ends_at: string | null;
  trial_reminder_stage: number | null;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = Date.now();
  let reminded = 0;
  let errors = 0;

  try {
    // Scan only trialing rows whose trial ends within the next ~3 days and that
    // still have a reminder left to send. Keeps the scan cheap (see the partial
    // index in the migration).
    const windowEnd = new Date(now + THREE_DAY_THRESHOLD * MS_PER_DAY).toISOString();
    const { data: subs } = await admin
      .from("zeroed_subscriptions")
      .select("user_id, trial_ends_at, trial_reminder_stage")
      .eq("status", "trialing")
      .not("trial_ends_at", "is", null)
      .lt("trial_reminder_stage", STAGE_ONE_DAY)
      .lte("trial_ends_at", windowEnd);

    for (const row of (subs ?? []) as TrialRow[]) {
      if (!row.user_id || !row.trial_ends_at) continue;

      try {
        const daysUntil = (new Date(row.trial_ends_at).getTime() - now) / MS_PER_DAY;

        // Already ended (handled by trial-expiry, not a reminder), or bad data.
        if (daysUntil <= 0) continue;

        const stage = row.trial_reminder_stage ?? 0;

        // Decide which threshold this row is due for. Prefer the 1-day reminder
        // when the trial is that close, even if the 3-day one was never sent
        // (e.g. a short trial), and always advance the stage forward.
        let nextStage: number;
        let daysLeft: number;
        if (daysUntil <= ONE_DAY_THRESHOLD && stage < STAGE_ONE_DAY) {
          nextStage = STAGE_ONE_DAY;
          daysLeft = 1;
        } else if (daysUntil <= THREE_DAY_THRESHOLD && stage < STAGE_THREE_DAY) {
          nextStage = STAGE_THREE_DAY;
          daysLeft = Math.max(2, Math.ceil(daysUntil));
        } else {
          continue;
        }

        const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
        const to = userData.user?.email;
        if (!to) continue;

        const { subject, html } = trialEndingEmail({ daysLeft, upgradeUrl: UPGRADE_URL });
        const res = await sendEmail({
          to,
          subject,
          html,
          bypassSettingsCheck: true,
          userId: row.user_id,
          emailType: "trial_reminder",
        });

        if (res.success) {
          await admin
            .from("zeroed_subscriptions")
            .update({ trial_reminder_stage: nextStage })
            .eq("user_id", row.user_id);
          reminded++;
        } else {
          errors++;
        }
      } catch (err) {
        console.error(`Trial reminder failed for user ${row.user_id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ message: "Trial reminders processed", reminded, errors });
  } catch (error) {
    console.error("Trial-reminders cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
