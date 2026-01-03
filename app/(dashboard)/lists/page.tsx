import { FolderOpen, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListGrid } from "@/components/lists/list-grid";

export default async function ListsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch lists with task counts
  const { data: lists } = await supabase
    .from("zeroed_lists")
    .select(
      `
      *,
      zeroed_tasks(count)
    `
    )
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("position", { ascending: true });

  // Transform to include task count
  const listsWithCounts =
    lists?.map((list) => ({
      ...list,
      taskCount: (list.zeroed_tasks as unknown as { count: number }[])?.[0]?.count || 0,
    })) || [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Lists" />

      <div className="flex-1 overflow-auto p-6">
        {listsWithCounts.length === 0 ? (
          <Card className="max-w-md mx-auto mt-12">
            <CardHeader className="text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>No Lists Yet</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Create your first list to start organizing tasks.
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create List
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ListGrid lists={listsWithCounts} />
        )}
      </div>
    </div>
  );
}
