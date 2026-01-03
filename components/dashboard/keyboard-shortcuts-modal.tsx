"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SHORTCUT_GROUPS = [
  {
    name: "Global",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command menu" },
      { keys: ["⌘", "B"], description: "Brain dump" },
      { keys: ["⌘", "⇧", "F"], description: "Start focus session" },
      { keys: ["N"], description: "New task" },
      { keys: ["Q"], description: "Quick capture" },
      { keys: ["/"], description: "Search" },
      { keys: ["T"], description: "Go to Today" },
      { keys: ["F"], description: "Go to Focus" },
    ],
  },
  {
    name: "Task Actions",
    shortcuts: [
      { keys: ["C"], description: "Complete selected task" },
      { keys: ["E"], description: "Edit selected task" },
      { keys: ["⌫"], description: "Delete selected task" },
      { keys: ["⌘", "A"], description: "Select all tasks" },
      { keys: ["Esc"], description: "Clear selection" },
    ],
  },
  {
    name: "Navigation",
    shortcuts: [
      { keys: ["↑"], description: "Move selection up" },
      { keys: ["↓"], description: "Move selection down" },
      { keys: ["Enter"], description: "Open selected task" },
    ],
  },
  {
    name: "Focus Timer",
    shortcuts: [
      { keys: ["Space"], description: "Pause / Resume timer" },
      { keys: ["Esc"], description: "Stop timer" },
    ],
  },
];

function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">Shortcuts</span>
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1 font-mono text-[10px]">
            ?
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2 py-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.name}>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                {group.name}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <ShortcutKey key={j}>{key}</ShortcutKey>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center border-t pt-4">
          Press <ShortcutKey>?</ShortcutKey> anytime to show this menu
        </p>
      </DialogContent>
    </Dialog>
  );
}
