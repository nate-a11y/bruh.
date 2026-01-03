"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagBadge } from "./tag-badge";
import { createTag, updateTag, deleteTag } from "@/app/(dashboard)/actions";
import { toast } from "sonner";
import { LIST_COLORS } from "@/lib/constants";
import type { Tag } from "@/lib/supabase/types";

interface TagManagerProps {
  tags: Tag[];
}

export function TagManager({ tags: initialTags }: TagManagerProps) {
  const [tags, setTags] = useState(initialTags);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(LIST_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;

    const formData = new FormData();
    formData.set("name", newTagName.trim());
    formData.set("color", newTagColor);

    const result = await createTag(formData);

    if (result.error) {
      toast.error(result.error);
    } else if (result.tag) {
      setTags([...tags, result.tag]);
      setNewTagName("");
      toast.success("Tag created");
    }
  }

  async function handleUpdate(tagId: string) {
    if (!editName.trim()) return;

    const result = await updateTag(tagId, { name: editName.trim() });

    if (result.error) {
      toast.error(result.error);
    } else {
      setTags(tags.map((t) => (t.id === tagId ? { ...t, name: editName } : t)));
      setEditingId(null);
      toast.success("Tag updated");
    }
  }

  async function handleDelete(tagId: string) {
    const result = await deleteTag(tagId);

    if (result.error) {
      toast.error(result.error);
    } else {
      setTags(tags.filter((t) => t.id !== tagId));
      toast.success("Tag deleted");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new tag */}
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag name"
            className="flex-1"
          />
          <div className="flex gap-1">
            {LIST_COLORS.slice(0, 6).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewTagColor(color)}
                className={cn(
                  "h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                  newTagColor === color ? "ring-foreground" : "ring-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <Button type="submit" size="sm" disabled={!newTagName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {/* Tag list */}
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-2 rounded-lg border"
            >
              {editingId === tag.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 w-48"
                  autoFocus
                  onBlur={() => handleUpdate(tag.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(tag.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <TagBadge tag={tag} />
              )}

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingId(tag.id);
                    setEditName(tag.name);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(tag.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tags yet. Create your first tag above.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
