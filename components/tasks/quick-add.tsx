"use client";

import { useState, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createQuickTask } from "@/app/(dashboard)/actions";

interface QuickAddProps {
  defaultListId: string;
  placeholder?: string;
}

export function QuickAdd({
  defaultListId,
  placeholder = "Add a task for today...",
}: QuickAddProps) {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await createQuickTask(value.trim(), defaultListId);
    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Added. Get it done.");
      setValue("");
      // Keep focus for rapid entry
      inputRef.current?.focus();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          disabled={isSubmitting}
        />
        {isSubmitting && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting || !value.trim()}>
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>
    </form>
  );
}
