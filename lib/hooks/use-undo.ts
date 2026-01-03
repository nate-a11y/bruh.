"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { executeUndo, getUndoAction } from "@/app/(dashboard)/actions";

export function useUndo() {
  const undoLast = useCallback(async () => {
    const undoAction = await getUndoAction();
    if (!undoAction) {
      toast.error("Nothing to undo");
      return;
    }

    const result = await executeUndo(undoAction.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Action undone");
    }
  }, []);

  const showUndoToast = useCallback((
    message: string,
    description?: string
  ) => {
    toast.success(message, {
      description,
      action: {
        label: "Undo",
        onClick: undoLast,
      },
      duration: 5000, // 5 seconds to undo
    });
  }, [undoLast]);

  return { showUndoToast, undoLast };
}
