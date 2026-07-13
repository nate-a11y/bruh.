"use client";

import { useEffect, useState } from "react";
import { BrainDumpDialog } from "./brain-dump-dialog";
import type { List } from "@/lib/supabase/types";

interface BrainDumpProviderProps {
  lists: List[];
  defaultListId?: string;
  /** Whether the current user has Pro access (gates the voice mic). */
  isPro?: boolean;
}

export function BrainDumpProvider({ lists, defaultListId, isPro = false }: BrainDumpProviderProps) {
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
      isPro={isPro}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
