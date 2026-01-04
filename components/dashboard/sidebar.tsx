"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Timer,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  X,
  Menu,
  Trophy,
  Repeat,
  Target,
  Calendar,
  Users,
  Shield,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/app/(auth)/actions";
import { createListDirect } from "@/app/(dashboard)/actions";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
import type { List } from "@/lib/supabase/types";

interface SidebarProps {
  lists: List[];
  isAdmin?: boolean;
}

const navigation = [
  { name: "Today", href: "/today", icon: LayoutDashboard },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Lists", href: "/lists", icon: FolderOpen },
  { name: "Focus", href: "/focus", icon: Timer },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Habits", href: "/habits", icon: Repeat },
  { name: "Stats", href: "/stats", icon: BarChart3 },
  { name: "Teams", href: "/teams", icon: Users },
];

export function Sidebar({ lists, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewList && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNewList]);

  async function handleCreateList() {
    if (!newListName.trim()) return;

    setIsCreating(true);
    const result = await createListDirect(newListName.trim());
    setIsCreating(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("List created");
      setNewListName("");
      setShowNewList(false);
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href="/today">
          <Logo size="sm" />
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            item.href === "/today"
              ? pathname === "/today"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}

        <Separator className="my-4" />

        {/* Lists */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Lists
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setShowNewList(!showNewList)}
            >
              {showNewList ? (
                <X className="h-3 w-3" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Inline new list form */}
          {showNewList && (
            <div className="px-3 py-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateList();
                }}
                className="flex gap-1"
              >
                <Input
                  ref={inputRef}
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name"
                  className="h-7 text-sm"
                  disabled={isCreating}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 px-2"
                  disabled={isCreating || !newListName.trim()}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </form>
            </div>
          )}

          {lists.map((list) => {
            const isActive = pathname === `/lists/${list.id}`;
            return (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: list.color }}
                />
                <span className="truncate">{list.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Separator />

      {/* Footer */}
      <div className="p-2 space-y-1">
        <div className="px-3 py-1">
          <KeyboardShortcutsModal />
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/admin"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

// Mobile sidebar wrapper with hamburger menu
interface MobileSidebarProps {
  lists: List[];
  isAdmin?: boolean;
}

export function MobileSidebar({ lists, isAdmin }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Hamburger button - fixed position in top-left for mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-30 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar lists={lists} isAdmin={isAdmin} />
      </div>
    </>
  );
}
