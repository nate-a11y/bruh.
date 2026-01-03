"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagBadge } from "./tag-badge";
import {
  createTag,
  addTagToTask,
  removeTagFromTask,
} from "@/app/(dashboard)/actions";
import { toast } from "sonner";
import { LIST_COLORS } from "@/lib/constants";
import type { Tag } from "@/lib/supabase/types";

interface TagInputProps {
  taskId: string;
  selectedTags: Tag[];
  availableTags: Tag[];
  onUpdate?: () => void;
}

export function TagInput({
  taskId,
  selectedTags,
  availableTags,
  onUpdate,
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTags = availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(search.toLowerCase()) &&
      !selectedTags.some((t) => t.id === tag.id)
  );

  const showCreateOption =
    search.trim() &&
    !availableTags.some((t) => t.name.toLowerCase() === search.toLowerCase());

  async function handleSelectTag(tag: Tag) {
    const result = await addTagToTask(taskId, tag.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      onUpdate?.();
    }
    setSearch("");
  }

  async function handleRemoveTag(tagId: string) {
    const result = await removeTagFromTask(taskId, tagId);
    if (result.error) {
      toast.error(result.error);
    } else {
      onUpdate?.();
    }
  }

  async function handleCreateTag() {
    if (!search.trim()) return;

    setIsCreating(true);
    const formData = new FormData();
    formData.set("name", search.trim());
    formData.set(
      "color",
      LIST_COLORS[Math.floor(Math.random() * LIST_COLORS.length)]
    );

    const result = await createTag(formData);

    if (result.error) {
      toast.error(result.error);
    } else if (result.tag) {
      await addTagToTask(taskId, result.tag.id);
      toast.success(`Tag "${search}" created`);
      onUpdate?.();
    }

    setSearch("");
    setIsCreating(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {selectedTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size="sm"
          onRemove={() => handleRemoveTag(tag.id)}
        />
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or create tag..."
            className="h-8 mb-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreateOption) {
                e.preventDefault();
                handleCreateTag();
              }
            }}
          />

          <div className="max-h-48 overflow-auto space-y-1">
            {filteredTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleSelectTag(tag)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-left"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm">{tag.name}</span>
              </button>
            ))}

            {showCreateOption && (
              <button
                onClick={handleCreateTag}
                disabled={isCreating}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-left text-primary"
              >
                <Plus className="h-3 w-3" />
                <span className="text-sm">Create &quot;{search}&quot;</span>
              </button>
            )}

            {!filteredTags.length && !showCreateOption && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No tags found
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
