import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { ArchiveList } from "@/components/archive/archive-list";
import { ArchiveStats } from "@/components/archive/archive-stats";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Build query
  let query = supabase
    .from("zeroed_archive")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(100);

  if (params.q) {
    query = query.ilike("title", `%${params.q}%`);
  }

  if (params.from) {
    query = query.gte("completed_at", params.from);
  }

  if (params.to) {
    query = query.lte("completed_at", params.to);
  }

  const { data: entries } = await query;

  // Stats
  const { data: stats } = await supabase
    .from("zeroed_archive")
    .select("completed_at, actual_minutes")
    .eq("user_id", user.id)
    .gte("completed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return (
    <div className="flex flex-col h-full">
      <Header title="Logbook" subtitle={entries?.length ? `${entries.length} completed` : undefined} />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <ArchiveStats data={stats || []} />
        <ArchiveList entries={entries || []} />
      </div>
    </div>
  );
}
