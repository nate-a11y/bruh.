import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

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
  const { data: lists } = await supabase
    .from("zeroed_lists")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("position", { ascending: true });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar lists={lists || []} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
