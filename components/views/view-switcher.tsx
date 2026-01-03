"use client";

import { LayoutGrid, Calendar, Table2, List, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ViewType } from "@/lib/constants";

const viewOptions = [
  { value: "list", label: "List", icon: List },
  { value: "kanban", label: "Kanban", icon: LayoutGrid },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "table", label: "Table", icon: Table2 },
  { value: "matrix", label: "Matrix", icon: Grid2X2 },
] as const;

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  compact?: boolean;
}

export function ViewSwitcher({ currentView, onViewChange, compact }: ViewSwitcherProps) {
  const CurrentIcon = viewOptions.find(v => v.value === currentView)?.icon || List;

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CurrentIcon className="h-4 w-4" />
            <span className="capitalize">{currentView}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {viewOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onViewChange(option.value)}
              className={cn(currentView === option.value && "bg-accent")}
            >
              <option.icon className="h-4 w-4 mr-2" />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {viewOptions.map((option) => (
        <Button
          key={option.value}
          variant={currentView === option.value ? "secondary" : "ghost"}
          size="sm"
          className="gap-2"
          onClick={() => onViewChange(option.value)}
        >
          <option.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{option.label}</span>
        </Button>
      ))}
    </div>
  );
}
