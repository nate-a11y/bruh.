import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar";
import { FloatingTimerWrapper } from "@/components/focus/floating-timer-wrapper";
import { BrainDumpProvider } from "@/components/tasks/brain-dump-provider";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { ProductTour } from "@/components/onboarding/product-tour";
import { TrialBanner } from "@/components/billing/trial-banner";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { isAdmin } from "@/lib/admin";
import { getPlatformSetting } from "@/lib/platform-settings";
import { checkSubscriptionAccess } from "@/lib/subscriptions";
import { isPro } from "@/lib/plans";

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

  const userIsAdmin = isAdmin(user.email);

  // Embedded mode: when the app runs inside the native WebView shell (bruh_native
  // cookie set by /auth/native), the native tab bar owns navigation, so drop the
  // web nav chrome (sidebars, floating timer, product tour) and just render content.
  const isNative = (await cookies()).get("bruh_native")?.value === "1";

  // Fetch everything the shell needs in parallel rather than in series -- these
  // reads are independent, so one round-trip instead of four.
  const [maintenanceMode, listsRes, prefsRes, access] = await Promise.all([
    getPlatformSetting("maintenance_mode"),
    supabase
      .from("zeroed_lists")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("position", { ascending: true }),
    supabase
      .from("zeroed_user_preferences")
      .select("onboarding_completed, display_name")
      .eq("user_id", user.id)
      .single(),
    checkSubscriptionAccess(user.id),
  ]);

  // Check maintenance mode - only admins can access during maintenance
  if (maintenanceMode && !userIsAdmin) {
    redirect("/maintenance");
  }

  let lists = listsRes.data;

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

  // Check if user needs onboarding. The dedicated `onboarding_completed` flag is
  // the primary signal, but existing users predate that flag (default false) and
  // already have a display_name from the old welcome flow -- treat them as onboarded
  // so they aren't forced back through the flow. `prefs` and `access` were fetched
  // in the parallel batch above.
  const prefs = prefsRes.data;
  const needsOnboarding = !prefs?.onboarding_completed && !prefs?.display_name;

  return (
    <PWAProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar (hidden in the native shell -- tab bar owns nav) */}
        {!isNative && (
          <div className="hidden md:block">
            <Sidebar lists={lists || []} isAdmin={userIsAdmin} />
          </div>
        )}
        {/* Mobile sidebar (hidden in the native shell) */}
        {!isNative && <MobileSidebar lists={lists || []} isAdmin={userIsAdmin} />}
        <main className="flex-1 overflow-auto">
          {/* Trial countdown + upgrade nudge (renders only while 'trialing') */}
          <TrialBanner status={access.status} daysRemaining={access.days_remaining} />
          {children}
        </main>
        {/* Floating timer - shows when focus session is active (native owns this) */}
        {!isNative && <FloatingTimerWrapper />}
        {/* Global brain dump dialog - triggered via ⌘B or command menu */}
        <BrainDumpProvider
          lists={lists || []}
          defaultListId={lists?.find(l => l.name === "Inbox")?.id || lists?.[0]?.id}
          isPro={isPro(access)}
        />
        {/* Onboarding flow for first-time users */}
        {needsOnboarding && <OnboardingFlow />}
        {/* Guided product tour (auto-runs once; skipped in the native shell -- it
            points at the web nav that isn't rendered here) */}
        {!isNative && <ProductTour enabled={!needsOnboarding} />}
      </div>
    </PWAProvider>
  );
}
