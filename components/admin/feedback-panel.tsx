"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Bug, Lightbulb, MessageCircle, Loader2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FeedbackItem {
  id: string;
  email: string | null;
  category: string;
  message: string;
  status: string;
  page: string | null;
  created_at: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bug: Bug,
  idea: Lightbulb,
  other: MessageCircle,
};

export function FeedbackPanel() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/feedback");
        const data = await res.json();
        if (active) setItems(data.feedback ?? []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function setStatus(id: string, status: string) {
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading feedback...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">No feedback yet.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((f) => {
        const Icon = ICONS[f.category] ?? MessageCircle;
        return (
          <Card key={f.id} className={f.status === "done" ? "opacity-60" : undefined}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="font-medium capitalize">{f.category}</span>
                  <span className="text-muted-foreground">{f.email ?? "unknown"}</span>
                  {f.status !== "new" && (
                    <Badge variant="secondary" className="capitalize">
                      {f.status}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(f.created_at), "MMM d, HH:mm")}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{f.message}</p>
              <div className="mt-3 flex items-center gap-2">
                {f.page && <span className="text-xs text-muted-foreground">on {f.page}</span>}
                <div className="ml-auto flex gap-2">
                  {f.status !== "reviewed" && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStatus(f.id, "reviewed")}>
                      Reviewed
                    </Button>
                  )}
                  {f.status !== "done" && (
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setStatus(f.id, "done")}>
                      <Check className="h-3 w-3" /> Done
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
