"use client";

import { useState } from "react";
import { Clock, Sun, CalendarDays, CalendarRange, Calendar } from "lucide-react";
import { format, addDays, nextMonday, startOfMonth, addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { snoozeTask, unsnoozeTask } from "@/app/(dashboard)/actions";
import { toast } from "sonner";

interface SnoozePickerProps {
  taskId: string;
  taskTitle: string;
  onSnoozed?: () => void;
}

export function SnoozePicker({ taskId, taskTitle, onSnoozed }: SnoozePickerProps) {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const quickOptions = [
    {
      label: "Tomorrow",
      value: "tomorrow" as const,
      icon: Sun,
      date: addDays(new Date(), 1),
    },
    {
      label: "Next Week",
      value: "next_week" as const,
      icon: CalendarDays,
      date: nextMonday(new Date()),
    },
    {
      label: "Next Month",
      value: "next_month" as const,
      icon: CalendarRange,
      date: startOfMonth(addMonths(new Date(), 1)),
    },
  ];

  async function handleSnooze(until: Date | 'tomorrow' | 'next_week' | 'next_month') {
    const result = await snoozeTask(taskId, until);

    if (result.error) {
      toast.error(result.error);
    } else {
      const dateStr = result.snoozedUntil
        ? format(new Date(result.snoozedUntil), "MMM d")
        : "";
      toast.success(`Snoozed until ${dateStr}`, {
        description: taskTitle,
        action: {
          label: "Undo",
          onClick: () => unsnoozeTask(taskId),
        },
      });
      setOpen(false);
      onSnoozed?.();
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Clock className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        {!showCalendar ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              Snooze until...
            </p>
            {quickOptions.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleSnooze(option.value)}
              >
                <option.icon className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {format(option.date, "MMM d")}
                </span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setShowCalendar(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Pick a date...
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCalendar(false)}
            >
              ← Back
            </Button>
            <CalendarUI
              mode="single"
              selected={undefined}
              onSelect={(date) => date && handleSnooze(date)}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
