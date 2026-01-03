"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Target,
  LayoutDashboard,
  FolderOpen,
  Timer,
  BarChart3,
  Settings,
  LogOut,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/app/(auth)/actions";
import type { List } from "@/lib/supabase/types";

interface SidebarProps {
  lists: List[];
}

const navigation = [
  { name: "Today", href: "/today", icon: LayoutDashboard },
  { name: "Lists", href: "/lists", icon: FolderOpen },
  { name: "Focus", href: "/focus", icon: Timer },
  { name: "Stats", href: "/stats", icon: BarChart3 },
];

export function Sidebar({ lists }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href="/today" className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Zeroed</span>
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
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
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
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
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: list.color }}
                />
                {list.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <Separator />

      {/* Footer */}
      <div className="p-2 space-y-1">
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
