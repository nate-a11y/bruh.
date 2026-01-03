"use client";

import { useState } from "react";
import { ViewSwitcher } from "./view-switcher";
import { KanbanBoard } from "./kanban-board";
import { CalendarView } from "./calendar-view";
import { TableView } from "./table-view";
import { EisenhowerMatrix } from "./eisenhower-matrix";
import { TaskList } from "@/components/tasks/task-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskWithRelations, List, Tag } from "@/lib/supabase/types";
import type { ViewType, KanbanGroupBy } from "@/lib/constants";

interface TaskViewsProps {
  tasks: TaskWithRelations[];
  lists: List[];
  tags: Tag[];
  defaultView?: ViewType;
  onTaskClick?: (task: TaskWithRelations) => void;
  onAddTask?: () => void;
}

export function TaskViews({
  tasks,
  lists,
  tags,
  defaultView = "list",
  onTaskClick,
  onAddTask,
}: TaskViewsProps) {
  const [currentView, setCurrentView] = useState<ViewType>(defaultView);
  const [kanbanGroupBy, setKanbanGroupBy] = useState<KanbanGroupBy>("status");

  // Filter out subtasks for main views
  const mainTasks = tasks.filter(t => !t.is_subtask);

  return (
    <div className="space-y-4">
      {/* View Controls */}
      <div className="flex items-center justify-between gap-4">
        <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />

        {currentView === "kanban" && (
          <Select value={kanbanGroupBy} onValueChange={(v) => setKanbanGroupBy(v as KanbanGroupBy)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
              <SelectItem value="list">By List</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* View Content */}
      {currentView === "list" && (
        <TaskList tasks={mainTasks} lists={lists} />
      )}

      {currentView === "kanban" && (
        <KanbanBoard
          tasks={mainTasks}
          lists={lists}
          groupBy={kanbanGroupBy}
          onTaskClick={onTaskClick}
        />
      )}

      {currentView === "calendar" && (
        <CalendarView tasks={mainTasks} onTaskClick={onTaskClick} />
      )}

      {currentView === "table" && (
        <TableView tasks={mainTasks} lists={lists} onTaskClick={onTaskClick} />
      )}

      {currentView === "matrix" && (
        <EisenhowerMatrix tasks={mainTasks} onTaskClick={onTaskClick} />
      )}
    </div>
  );
}
