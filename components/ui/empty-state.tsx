import { getEmptyState, type EmptyStateType } from '@/lib/copy/empty-states';
import { Inbox, CheckCircle, Search, FolderOpen, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type: EmptyStateType;
  className?: string;
}

const icons = {
  inbox: Inbox,
  today: Calendar,
  completed: CheckCircle,
  search: Search,
  project: FolderOpen,
};

export function EmptyState({ type, className }: EmptyStateProps) {
  const Icon = icons[type];
  const message = getEmptyState(type);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm max-w-[200px]">{message}</p>
    </div>
  );
}
