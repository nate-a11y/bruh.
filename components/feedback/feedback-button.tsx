"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { MessageSquarePlus, Bug, Lightbulb, MessageCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Category = "bug" | "idea" | "other";

const OPTIONS: { value: Category; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "idea", label: "Idea", icon: Lightbulb },
  { value: "bug", label: "Bug", icon: Bug },
  { value: "other", label: "Other", icon: MessageCircle },
];

export function FeedbackButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Add a quick note first.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: trimmed, page: pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not send feedback.");
        return;
      }
      toast.success("Thanks. We read every one.");
      setMessage("");
      setOpen(false);
    } catch {
      toast.error("Could not send feedback.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        data-tour="feedback"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground w-full",
          className
        )}
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>
              Idea, bug, or anything on your mind. It goes straight to us and we read every one.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border py-3 text-xs transition-colors",
                  category === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            ))}
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              category === "bug"
                ? "What broke? What were you trying to do?"
                : category === "idea"
                ? "What would make bruh. better for you?"
                : "What's on your mind?"
            }
            rows={5}
            maxLength={5000}
            className="resize-none"
          />

          <Button onClick={submit} disabled={sending} className="w-full gap-2">
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {sending ? "Sending..." : "Send feedback"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
