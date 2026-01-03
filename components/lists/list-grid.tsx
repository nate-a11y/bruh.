"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListCard } from "./list-card";
import { ListForm } from "./list-form";
import type { List } from "@/lib/supabase/types";

interface ListGridProps {
  lists: (List & { taskCount: number })[];
}

export function ListGrid({ lists }: ListGridProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Your Lists</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New List
        </Button>
      </div>

      {showForm && <ListForm onClose={() => setShowForm(false)} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} />
        ))}
      </div>
    </div>
  );
}
