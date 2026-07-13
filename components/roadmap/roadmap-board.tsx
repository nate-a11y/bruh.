"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ChevronUp, Plus, Loader2, Map } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  title: string;
  description: string | null;
  status: string;
  votes: number;
  voted: boolean;
}

const SECTIONS: { status: string; label: string }[] = [
  { status: "in_progress", label: "In progress" },
  { status: "planned", label: "Planned" },
  { status: "under_review", label: "Under review" },
  { status: "done", label: "Shipped" },
];

const ADMIN_STATUS_OPTIONS = [
  { value: "under_review", label: "Under review" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Shipped" },
  { value: "declined", label: "Not planned" },
];

export function RoadmapBoard({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/roadmap");
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleVote(item: Item) {
    // Optimistic
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, voted: !i.voted, votes: i.votes + (i.voted ? -1 : 1) }
          : i
      )
    );
    const res = await fetch("/api/roadmap/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    }).catch(() => null);
    if (!res || !res.ok) {
      toast.error("Could not register your vote.");
      load();
    }
  }

  async function submit() {
    const t = title.trim();
    if (!t) {
      toast.error("Give it a title.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, description: description.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not submit.");
        return;
      }
      toast.success("Thanks. Your request is up for votes.");
      setTitle("");
      setDescription("");
      setOpen(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(item: Item, status: string) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));
    await fetch("/api/admin/roadmap", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status }),
    }).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Map className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Roadmap</h1>
            <p className="text-sm text-muted-foreground">
              Vote on what we build next, or suggest your own.
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Suggest
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading roadmap...
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet. Be the first to suggest a feature.
        </p>
      ) : (
        SECTIONS.map((section) => {
          const sectionItems = items.filter((i) => i.status === section.status);
          if (sectionItems.length === 0) return null;
          return (
            <div key={section.status} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </h2>
              {sectionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <button
                    type="button"
                    onClick={() => toggleVote(item)}
                    className={cn(
                      "flex w-12 shrink-0 flex-col items-center rounded-lg border py-1.5 transition-colors",
                      item.voted
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                    aria-pressed={item.voted}
                  >
                    <ChevronUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">{item.votes}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                    )}
                    {isAdmin && (
                      <select
                        value={item.status}
                        onChange={(e) => changeStatus(item, e.target.value)}
                        className="mt-2 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                      >
                        {ADMIN_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suggest a feature</DialogTitle>
            <DialogDescription>
              What would make bruh. better for you? Others can vote on it.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short title"
            maxLength={140}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any details? (optional)"
            rows={4}
            maxLength={2000}
            className="resize-none"
          />
          <Button onClick={submit} disabled={submitting} className="w-full gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
