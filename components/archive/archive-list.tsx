"use client";

import { useState } from "react";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { Search, Calendar, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";

interface ArchiveEntry {
  id: string;
  title: string;
  notes: string | null;
  list_name: string | null;
  list_color: string | null;
  priority: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  completed_at: string;
}

function groupByDate(entries: ArchiveEntry[]) {
  const groups: Record<string, ArchiveEntry[]> = {};

  entries.forEach(entry => {
    const date = new Date(entry.completed_at);
    let key: string;

    if (isToday(date)) key = "Today";
    else if (isYesterday(date)) key = "Yesterday";
    else if (isThisWeek(date)) key = "This Week";
    else if (isThisMonth(date)) key = "This Month";
    else key = format(date, "MMMM yyyy");

    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });

  return groups;
}

export function ArchiveList({ entries }: { entries: ArchiveEntry[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");

  function handleSearch(value: string) {
    setSearch(value);
    const params = new URLSearchParams(searchParams);
    if (value) params.set("q", value);
    else params.delete("q");
    router.push(`/archive?${params.toString()}`);
  }

  const grouped = groupByDate(entries);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search completed tasks..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Entries */}
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {group}
            <Badge variant="secondary">{items.length}</Badge>
          </h3>
          <div className="space-y-1">
            {items.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {entry.list_name && (
                      <span style={{ color: entry.list_color || undefined }}>
                        {entry.list_name}
                      </span>
                    )}
                    {entry.actual_minutes && (
                      <span>{entry.actual_minutes}m</span>
                    )}
                    <span>{format(new Date(entry.completed_at), "h:mm a")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {entries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No completed tasks found</p>
        </div>
      )}
    </div>
  );
}
