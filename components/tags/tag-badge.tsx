"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/supabase/types";

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  size?: "sm" | "default";
  className?: string;
}

export function TagBadge({
  tag,
  onRemove,
  size = "default",
  className,
}: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium border",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className
      )}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        borderColor: `${tag.color}40`,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/10 rounded-full p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
