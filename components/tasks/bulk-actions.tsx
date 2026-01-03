"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Trash2,
  FolderOpen,
  X,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { completeTask, deleteTask, updateTask } from "@/app/(dashboard)/actions";
import type { List } from "@/lib/supabase/types";

interface BulkActionsProps {
  selectedIds: string[];
  lists: List[];
  onClearSelection: () => void;
  onComplete?: () => void;
}

export function BulkActions({
  selectedIds,
  lists,
  onClearSelection,
  onComplete,
}: BulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedIds.length === 0) return null;

  const handleCompleteAll = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(selectedIds.map((id) => completeTask(id)));
      toast.success(`Completed ${selectedIds.length} tasks`);
      onClearSelection();
      onComplete?.();
    } catch (error) {
      toast.error("Failed to complete some tasks");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteTask(id)));
      toast.success(`Deleted ${selectedIds.length} tasks`);
      onClearSelection();
      onComplete?.();
    } catch (error) {
      toast.error("Failed to delete some tasks");
    } finally {
      setIsProcessing(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleMoveToList = async (listId: string) => {
    setIsProcessing(true);
    try {
      await Promise.all(
        selectedIds.map((id) => updateTask(id, { list_id: listId }))
      );

      const list = lists.find((l) => l.id === listId);
      toast.success(`Moved ${selectedIds.length} tasks to ${list?.name || "list"}`);
      onClearSelection();
      onComplete?.();
    } catch (error) {
      toast.error("Failed to move some tasks");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border animate-in slide-in-from-bottom-2">
        <span className="text-sm font-medium px-2">
          {selectedIds.length} selected
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCompleteAll}
            disabled={isProcessing}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Complete
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={isProcessing}>
                <FolderOpen className="h-4 w-4 mr-1" />
                Move
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {lists.map((list) => (
                <DropdownMenuItem
                  key={list.id}
                  onClick={() => handleMoveToList(list.id)}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: list.color }}
                  />
                  {list.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isProcessing}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These tasks will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
