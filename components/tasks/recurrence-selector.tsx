"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecurrenceRule } from "@/lib/supabase/types";

interface RecurrenceSelectorProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function RecurrenceSelector({
  value,
  onChange,
}: RecurrenceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceRule["frequency"]>(
    value?.frequency || "daily"
  );
  const [interval, setInterval] = useState(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    value?.daysOfWeek || [1, 2, 3, 4, 5]
  );
  const [endDate, setEndDate] = useState(value?.endDate || "");

  function handleSave() {
    const rule: RecurrenceRule = {
      frequency,
      interval,
      ...(frequency === "weekly" && daysOfWeek.length > 0 && { daysOfWeek }),
      ...(endDate && { endDate }),
    };
    onChange(rule);
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setOpen(false);
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function getDisplayText(): string {
    if (!value) return "Set recurrence";

    const { frequency, interval, daysOfWeek } = value;

    if (frequency === "daily") {
      return interval === 1 ? "Daily" : `Every ${interval} days`;
    }
    if (frequency === "weekly") {
      if (
        daysOfWeek?.length === 5 &&
        !daysOfWeek.includes(0) &&
        !daysOfWeek.includes(6)
      ) {
        return "Weekdays";
      }
      if (interval === 1 && !daysOfWeek?.length) {
        return "Weekly";
      }
      return `Every ${interval > 1 ? interval + " " : ""}week${interval > 1 ? "s" : ""}`;
    }
    if (frequency === "monthly") {
      return interval === 1 ? "Monthly" : `Every ${interval} months`;
    }
    if (frequency === "yearly") {
      return interval === 1 ? "Yearly" : `Every ${interval} years`;
    }
    return "Custom";
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={value ? "secondary" : "outline"}
          size="sm"
          className={cn("h-8", value && "text-primary")}
        >
          <Repeat className="h-4 w-4 mr-1" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Repeat</Label>
            <Select
              value={frequency}
              onValueChange={(v) =>
                setFrequency(v as RecurrenceRule["frequency"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Every</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="99"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                {frequency === "daily" && (interval === 1 ? "day" : "days")}
                {frequency === "weekly" && (interval === 1 ? "week" : "weeks")}
                {frequency === "monthly" &&
                  (interval === 1 ? "month" : "months")}
                {frequency === "yearly" && (interval === 1 ? "year" : "years")}
              </span>
            </div>
          </div>

          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label>On days</Label>
              <div className="flex gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "h-8 w-8 rounded-full text-xs font-medium transition-colors",
                      daysOfWeek.includes(day.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {day.label[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Ends</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Never"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to repeat forever
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
