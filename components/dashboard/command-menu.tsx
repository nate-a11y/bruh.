"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Timer,
  BarChart3,
  Settings,
  Plus,
  Sun,
  Moon,
  Laptop,
  Brain,
  Target,
  Flame,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      // New task shortcut
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // This would open new task dialog - handled by parent
      }
      // Focus mode shortcut
      if (e.key === "f" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        router.push("/focus");
      }
      // Brain dump shortcut
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-brain-dump"));
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [router]);

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-9 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <span className="hidden xl:inline-flex text-muted-foreground">
          Search commands...
        </span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
        <span className="xl:hidden">⌘K</span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => router.push("/today"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Today
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/lists"))}
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              Lists
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/focus"))}
            >
              <Timer className="mr-2 h-4 w-4" />
              Focus Mode
              <CommandShortcut>⌘⇧F</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/stats"))}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Stats
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/settings"))}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runCommand(() => {})}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => {
                // Dispatch custom event for brain dump
                window.dispatchEvent(new CustomEvent("open-brain-dump"));
              })}
            >
              <Brain className="mr-2 h-4 w-4" />
              Brain Dump
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/focus"))}
            >
              <Timer className="mr-2 h-4 w-4" />
              Start Focus Session
              <CommandShortcut>⌘⇧F</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Track">
            <CommandItem onSelect={() => runCommand(() => router.push("/goals"))}>
              <Target className="mr-2 h-4 w-4" />
              Goals
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/habits"))}>
              <Flame className="mr-2 h-4 w-4" />
              Habits
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <Sun className="mr-2 h-4 w-4" />
              Light
              {theme === "light" && <CommandShortcut>✓</CommandShortcut>}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
              {theme === "dark" && <CommandShortcut>✓</CommandShortcut>}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
              <Laptop className="mr-2 h-4 w-4" />
              System
              {theme === "system" && <CommandShortcut>✓</CommandShortcut>}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
