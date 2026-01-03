"use client";

import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickAdd } from "./quick-add";
import { BrainDumpDialog } from "./brain-dump-dialog";
import type { List } from "@/lib/supabase/types";

interface QuickCaptureBarProps {
  lists: List[];
  defaultListId: string;
  placeholder?: string;
}

export function QuickCaptureBar({
  lists,
  defaultListId,
  placeholder,
}: QuickCaptureBarProps) {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <QuickAdd defaultListId={defaultListId} placeholder={placeholder} />
      </div>
      <BrainDumpDialog
        lists={lists}
        defaultListId={defaultListId}
        trigger={
          <Button variant="outline" size="icon" className="shrink-0" title="Brain Dump">
            <Brain className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}
