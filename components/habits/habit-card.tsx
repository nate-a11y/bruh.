"use client";

import { useState } from "react";
import { Check, Flame, MoreHorizontal, Plus, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { logHabitCompletion, deleteHabit, updateHabit } from "@/app/(dashboard)/actions";
import { toast } from "sonner";
import type { Habit } from "@/lib/supabase/types";

interface HabitCardProps {
  habit: Habit;
  todayCount?: number;
  onEdit?: () => void;
}

export function HabitCard({ habit, todayCount = 0, onEdit }: HabitCardProps) {
  const [count, setCount] = useState(todayCount);
  const isCompleted = count >= habit.target_per_day;

  async function handleIncrement() {
    const result = await logHabitCompletion(habit.id, 1);
    if (result.error) {
      toast.error(result.error);
    } else {
      setCount(prev => prev + 1);
      if (count + 1 >= habit.target_per_day) {
        toast.success("Habit done. Consistency looks good on you.");
      }
    }
  }

  return (
    <Card className={cn(isCompleted && "border-green-500/50 bg-green-500/5")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleIncrement}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all",
              isCompleted
                ? "bg-green-500 text-white"
                : "bg-muted hover:bg-muted/80"
            )}
            style={{
              backgroundColor: isCompleted ? habit.color : undefined,
            }}
          >
            {isCompleted ? <Check className="h-6 w-6" /> : habit.icon}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{habit.name}</h3>
              {habit.streak_current > 0 && (
                <span className="flex items-center gap-1 text-xs text-orange-500">
                  <Flame className="h-3 w-3" />
                  {habit.streak_current}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5">
                {Array.from({ length: habit.target_per_day }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      i < count ? "bg-green-500" : "bg-muted"
                    )}
                    style={{ backgroundColor: i < count ? habit.color : undefined }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {count} / {habit.target_per_day}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {habit.target_per_day > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleIncrement}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateHabit(habit.id, { is_archived: true })}>
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteHabit(habit.id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
