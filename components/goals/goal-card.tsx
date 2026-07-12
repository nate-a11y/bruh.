"use client";

import { Target, Calendar, TrendingUp, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { deleteGoal, updateGoal } from "@/app/(dashboard)/actions";
import type { Goal } from "@/lib/supabase/types";

interface GoalCardProps {
  goal: Goal;
  onEdit?: () => void;
}

export function GoalCard({ goal, onEdit }: GoalCardProps) {
  const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
  const isCompleted = goal.status === "completed" || progress >= 100;

  return (
    <Card className={cn(isCompleted && "opacity-75")}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
          >
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className={cn("font-medium", isCompleted && "line-through")}>{goal.title}</h3>
            {goal.description && (
              <p className="text-xs text-muted-foreground">{goal.description}</p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Goal options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateGoal(goal.id, { status: "paused" })}>
              Pause
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteGoal(goal.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {goal.current_value} / {goal.target_value}
          </span>
        </div>
        <Progress value={Math.min(progress, 100)} className="h-2" />
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(goal.start_date), "MMM d")}
            {goal.end_date && ` - ${format(new Date(goal.end_date), "MMM d")}`}
          </span>
          <span className="flex items-center gap-1 capitalize">
            <TrendingUp className="h-3 w-3" />
            {goal.period}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
