import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar";
import { FloatingTimerWrapper } from "@/components/focus/floating-timer-wrapper";
import { BrainDumpProvider } from "@/components/tasks/brain-dump-provider";

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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar lists={lists || []} />
      </div>
      {/* Mobile sidebar */}
      <MobileSidebar lists={lists || []} />
      <main className="flex-1 overflow-auto">{children}</main>
      {/* Floating timer - shows when focus session is active */}
      <FloatingTimerWrapper />
      {/* Global brain dump dialog - triggered via ⌘B or command menu */}
      <BrainDumpProvider
        lists={lists || []}
        defaultListId={lists?.find(l => l.name === "Inbox")?.id || lists?.[0]?.id}
      />
    </div>
  );
}
