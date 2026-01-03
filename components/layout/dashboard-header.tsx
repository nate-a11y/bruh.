'use client';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Search } from 'lucide-react';

interface TaskStats {
  overdue: number;
  dueToday: number;
  completedToday: number;
}

interface DashboardHeaderProps {
  stats?: TaskStats;
  onAddTask?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
}

export function DashboardHeader({
  stats = { overdue: 0, dueToday: 0, completedToday: 0 },
  onAddTask,
  onSearch,
  onSettings,
}: DashboardHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const getSubtext = () => {
    if (stats.overdue > 3) return "You've got some catching up to do.";
    if (stats.overdue > 0) return `${stats.overdue} overdue. Handle it.`;
    if (stats.dueToday > 5) return 'Busy day. Lock in.';
    if (stats.dueToday > 0) return `${stats.dueToday} tasks today. You got this.`;
    if (stats.completedToday > 0) return 'Solid progress today.';
    return 'Ready when you are.';
  };

  return (
    <header className="flex items-center justify-between py-6 px-4 border-b border-border">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">
          {getGreeting()}.
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{getSubtext()}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onSearch}>
          <Search className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettings}>
          <Settings className="w-5 h-5" />
        </Button>
        <Button size="default" onClick={onAddTask}>
          <Plus className="w-4 h-4 mr-2" />
          Add task
        </Button>
      </div>
    </header>
  );
}
