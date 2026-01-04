import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendEmail, dailyDigestEmail } from "@/lib/email";
import { startOfDay, subDays, format } from "date-fns";

// This endpoint should be called by a cron job every morning (e.g., 7am)
// Secure with CRON_SECRET header
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cast to any to bypass type checking for new columns
    const supabase = createServiceClient() as any;
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Get all users with daily digest enabled
    const { data: users } = await supabase
      .from("zeroed_user_preferences")
      .select("user_id, display_name, daily_digest_enabled")
      .eq("daily_digest_enabled", true);

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No users with digest enabled", sent: 0 });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Get user's email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
        if (!authUser?.user?.email) continue;

        // Get today's tasks
        const { data: todayTasks } = await supabase
          .from("zeroed_tasks")
          .select("title, due_time")
          .eq("user_id", user.user_id)
          .eq("due_date", format(today, "yyyy-MM-dd"))
          .neq("status", "completed")
          .neq("status", "cancelled")
          .order("due_time", { ascending: true, nullsFirst: false });

        // Get overdue tasks
        const { data: overdueTasks } = await supabase
          .from("zeroed_tasks")
          .select("title, due_date")
          .eq("user_id", user.user_id)
          .lt("due_date", format(today, "yyyy-MM-dd"))
          .neq("status", "completed")
          .neq("status", "cancelled");

        // Get tasks completed yesterday
        const { count: completedYesterday } = await supabase
          .from("zeroed_tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.user_id)
          .eq("status", "completed")
          .gte("completed_at", yesterday.toISOString())
          .lt("completed_at", today.toISOString());

        // Format tasks for email
        const formattedTodayTasks = (todayTasks || []).map((t: any) => ({
          title: t.title,
          time: t.due_time ? format(new Date(`2000-01-01T${t.due_time}`), "h:mm a") : undefined,
        }));

        const formattedOverdueTasks = (overdueTasks || [])
          .filter((t: any) => t.due_date)
          .map((t: any) => ({
            title: t.title,
            daysOverdue: Math.floor(
              (today.getTime() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24)
            ),
          }));

        // Generate and send email
        const emailContent = dailyDigestEmail({
          userName: user.display_name || undefined,
          todayTasks: formattedTodayTasks,
          overdueTasks: formattedOverdueTasks,
          completedYesterday: completedYesterday || 0,
          dashboardLink: `${appUrl}/today`,
        });

        const result = await sendEmail({
          to: authUser.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (result.success) {
          sentCount++;
        } else {
          errors.push(`${authUser.user.email}: ${result.error}`);
        }
      } catch (err: any) {
        errors.push(`${user.user_id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      message: "Daily digest completed",
      sent: sentCount,
      total: users.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Daily digest error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing (still requires auth)
export async function GET(request: Request) {
  return POST(request);
}
