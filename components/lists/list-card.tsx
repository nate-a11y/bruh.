"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, Archive } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteList, updateList } from "@/app/(dashboard)/actions";
import type { List } from "@/lib/supabase/types";

interface ListCardProps {
  list: List & { taskCount: number };
}

export function ListCard({ list }: ListCardProps) {
  const isInbox = list.name === "Inbox";

  async function handleArchive() {
    const result = await updateList(list.id, { is_archived: true });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("List archived");
    }
  }

  async function handleDelete() {
    if (isInbox) {
      toast.error("Cannot delete the Inbox list");
      return;
    }
    const result = await deleteList(list.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("List deleted");
    }
  }

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Link href={`/lists/${list.id}`} className="flex-1">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: list.color }}
            />
            <CardTitle className="text-base font-medium">{list.name}</CardTitle>
          </div>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            {!isInbox && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <Link href={`/lists/${list.id}`}>
          <p className="text-sm text-muted-foreground">
            {list.taskCount} {list.taskCount === 1 ? "task" : "tasks"}
          </p>
        </Link>
      </CardContent>
    </Card>
  );
}
