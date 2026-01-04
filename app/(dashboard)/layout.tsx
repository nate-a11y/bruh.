import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar";
import { FloatingTimerWrapper } from "@/components/focus/floating-timer-wrapper";
import { BrainDumpProvider } from "@/components/tasks/brain-dump-provider";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { isAdmin } from "@/lib/admin";
import { getPlatformSetting } from "@/lib/platform-settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check maintenance mode - only admins can access during maintenance
  const userIsAdmin = isAdmin(user.email);
  const maintenanceMode = await getPlatformSetting("maintenance_mode");

  if (maintenanceMode && !userIsAdmin) {
    redirect("/maintenance");
  }

  // Fetch user's lists
  let { data: lists } = await supabase
    .from("zeroed_lists")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("position", { ascending: true });

  // First-time user setup: create Inbox list and preferences if needed
  if (!lists || lists.length === 0) {
    // Create default Inbox list
    const { data: newList } = await supabase
      .from("zeroed_lists")
      .insert({
        user_id: user.id,
        name: "Inbox",
        color: "#6366f1",
        icon: "inbox",
        position: 0,
      })
      .select()
      .single();

    if (newList) {
      lists = [newList];
    }

    // Ensure user preferences exist
    await supabase
      .from("zeroed_user_preferences")
      .upsert({ user_id: user.id }, { onConflict: "user_id" });
  }

  // Check if user has set their display name
  const { data: prefs } = await supabase
    .from("zeroed_user_preferences")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  const needsName = !prefs?.display_name;

  return (
    <PWAProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar lists={lists || []} isAdmin={userIsAdmin} />
        </div>
        {/* Mobile sidebar */}
        <MobileSidebar lists={lists || []} isAdmin={userIsAdmin} />
        <main className="flex-1 overflow-auto">{children}</main>
        {/* Floating timer - shows when focus session is active */}
        <FloatingTimerWrapper />
        {/* Global brain dump dialog - triggered via ⌘B or command menu */}
        <BrainDumpProvider
          lists={lists || []}
          defaultListId={lists?.find(l => l.name === "Inbox")?.id || lists?.[0]?.id}
        />
        {/* Welcome modal for first-time users */}
        {needsName && <WelcomeModal open={true} />}
      </div>
    </PWAProvider>
  );
}
