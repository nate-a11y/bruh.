import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";

export default async function RoadmapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <RoadmapBoard isAdmin={isAdmin(user?.email)} />
    </div>
  );
}
