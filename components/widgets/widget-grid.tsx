"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type WidgetType =
  | "today-stats"
  | "streak"
  | "habits"
  | "quick-add"
  | "upcoming"
  | "focus-stats"
  | "suggestions";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: "small" | "medium" | "large";
}

interface WidgetGridProps {
  widgets: WidgetConfig[];
  onAddWidget?: (type: WidgetType) => void;
  onRemoveWidget?: (id: string) => void;
  renderWidget: (widget: WidgetConfig) => React.ReactNode;
  editable?: boolean;
}

const WIDGET_CATALOG: Record<WidgetType, { title: string; description: string; defaultSize: WidgetConfig["size"] }> = {
  "today-stats": {
    title: "Today's Stats",
    description: "Tasks completed, focus time, and more",
    defaultSize: "medium",
  },
  streak: {
    title: "Streak Counter",
    description: "Your current productivity streak",
    defaultSize: "small",
  },
  habits: {
    title: "Habits",
    description: "Track your daily habits",
    defaultSize: "medium",
  },
  "quick-add": {
    title: "Quick Add",
    description: "Quickly add new tasks",
    defaultSize: "medium",
  },
  upcoming: {
    title: "Upcoming Tasks",
    description: "Tasks due soon",
    defaultSize: "large",
  },
  "focus-stats": {
    title: "Focus Stats",
    description: "Your focus session stats",
    defaultSize: "small",
  },
  suggestions: {
    title: "Smart Suggestions",
    description: "AI-powered productivity tips",
    defaultSize: "medium",
  },
};

const SIZE_CLASSES = {
  small: "col-span-1",
  medium: "col-span-1 md:col-span-2",
  large: "col-span-1 md:col-span-2 lg:col-span-3",
};

export function WidgetGrid({
  widgets,
  onAddWidget,
  onRemoveWidget,
  renderWidget,
  editable = false,
}: WidgetGridProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const existingTypes = new Set(widgets.map((w) => w.type));
  const availableWidgets = Object.entries(WIDGET_CATALOG).filter(
    ([type]) => !existingTypes.has(type as WidgetType)
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((widget, index) => (
          <motion.div
            key={widget.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(SIZE_CLASSES[widget.size])}
          >
            <Card className="h-full relative group">
              {editable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Drag to reorder"
                    className="h-6 w-6 cursor-grab"
                  >
                    <GripVertical className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove widget"
                    className="h-6 w-6 text-destructive"
                    onClick={() => onRemoveWidget?.(widget.id)}
                  >
                    ×
                  </Button>
                </div>
              )}
              {renderWidget(widget)}
            </Card>
          </motion.div>
        ))}

        {editable && availableWidgets.length > 0 && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Card className="h-full min-h-[150px] border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Plus className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Add Widget</p>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Widget</DialogTitle>
                <DialogDescription>
                  Choose a widget to add to your dashboard
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-4">
                {availableWidgets.map(([type, config]) => (
                  <Card
                    key={type}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      onAddWidget?.(type as WidgetType);
                      setShowAddDialog(false);
                    }}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium">{config.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

// Individual widget components
export function StatsWidget({ stats }: { stats: { tasksCompleted: number; focusMinutes: number; streak: number } }) {
  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Today's Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.tasksCompleted}</p>
            <p className="text-xs text-muted-foreground">Tasks Done</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.focusMinutes}</p>
            <p className="text-xs text-muted-foreground">Focus Min</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
        </div>
      </CardContent>
    </>
  );
}

export function StreakWidget({ streak, bestStreak }: { streak: number; bestStreak: number }) {
  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Streak</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <p className="text-4xl font-bold text-primary">{streak}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {streak === 1 ? "day" : "days"} in a row
          </p>
          {bestStreak > streak && (
            <p className="text-xs text-muted-foreground mt-2">
              Best: {bestStreak} days
            </p>
          )}
        </div>
      </CardContent>
    </>
  );
}

export function UpcomingWidget({ tasks }: { tasks: { id: string; title: string; dueDate: string }[] }) {
  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming tasks</p>
        ) : (
          <ul className="space-y-2">
            {tasks.slice(0, 5).map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="truncate flex-1">{task.title}</span>
                <span className="text-xs text-muted-foreground">{task.dueDate}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </>
  );
}
