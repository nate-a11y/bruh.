"use client";

import { useEffect, useState } from "react";
import { BrainDumpDialog } from "./brain-dump-dialog";
import type { List } from "@/lib/supabase/types";

interface BrainDumpProviderProps {
  lists: List[];
  defaultListId?: string;
}

export function BrainDumpProvider({ lists, defaultListId }: BrainDumpProviderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleOpenBrainDump() {
      setOpen(true);
    }

    window.addEventListener("open-brain-dump", handleOpenBrainDump);
    return () => window.removeEventListener("open-brain-dump", handleOpenBrainDump);
  }, []);

  return (
    <BrainDumpDialog
      lists={lists}
      defaultListId={defaultListId}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
