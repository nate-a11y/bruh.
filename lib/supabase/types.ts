export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Recurrence rule type
export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  endDate?: string; // ISO date string
  endAfter?: number; // End after X occurrences
}

// Filter config type
export interface FilterConfig {
  lists?: string[];
  tags?: string[];
  status?: ("pending" | "in_progress" | "completed" | "cancelled")[];
  priority?: ("low" | "normal" | "high" | "urgent")[];
  dueDateRange?: "today" | "week" | "month" | "overdue" | "no_date" | "has_date";
  isRecurring?: boolean;
  hasSubtasks?: boolean;
}

export type Database = {
  public: {
    Tables: {
      zeroed_lists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          position: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          icon?: string;
          position?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          icon?: string;
          position?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      zeroed_tasks: {
        Row: {
          id: string;
          user_id: string;
          list_id: string;
          title: string;
          notes: string | null;
          estimated_minutes: number;
          actual_minutes: number;
          status: "pending" | "in_progress" | "completed" | "cancelled";
          priority: "low" | "normal" | "high" | "urgent";
          due_date: string | null;
          due_time: string | null;
          position: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          // Subtask fields
          parent_id: string | null;
          is_subtask: boolean;
          // Recurrence fields
          is_recurring: boolean;
          recurrence_rule: RecurrenceRule | null;
          recurrence_parent_id: string | null;
          recurrence_index: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          list_id: string;
          title: string;
          notes?: string | null;
          estimated_minutes?: number;
          actual_minutes?: number;
          status?: "pending" | "in_progress" | "completed" | "cancelled";
          priority?: "low" | "normal" | "high" | "urgent";
          due_date?: string | null;
          due_time?: string | null;
          position?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          // Subtask fields
          parent_id?: string | null;
          is_subtask?: boolean;
          // Recurrence fields
          is_recurring?: boolean;
          recurrence_rule?: RecurrenceRule | null;
          recurrence_parent_id?: string | null;
          recurrence_index?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          list_id?: string;
          title?: string;
          notes?: string | null;
          estimated_minutes?: number;
          actual_minutes?: number;
          status?: "pending" | "in_progress" | "completed" | "cancelled";
          priority?: "low" | "normal" | "high" | "urgent";
          due_date?: string | null;
          due_time?: string | null;
          position?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          // Subtask fields
          parent_id?: string | null;
          is_subtask?: boolean;
          // Recurrence fields
          is_recurring?: boolean;
          recurrence_rule?: RecurrenceRule | null;
          recurrence_parent_id?: string | null;
          recurrence_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: "zeroed_tasks_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "zeroed_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "zeroed_tasks_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "zeroed_tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      zeroed_focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          duration_minutes: number;
          started_at: string;
          ended_at: string | null;
          completed: boolean;
          session_type: "focus" | "short_break" | "long_break";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          duration_minutes: number;
          started_at?: string;
          ended_at?: string | null;
          completed?: boolean;
          session_type?: "focus" | "short_break" | "long_break";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          duration_minutes?: number;
          started_at?: string;
          ended_at?: string | null;
          completed?: boolean;
          session_type?: "focus" | "short_break" | "long_break";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zeroed_focus_sessions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "zeroed_tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      zeroed_user_preferences: {
        Row: {
          id: string;
          user_id: string;
          theme: "dark" | "light" | "system";
          default_focus_minutes: number;
          short_break_minutes: number;
          long_break_minutes: number;
          sessions_before_long_break: number;
          sound_enabled: boolean;
          notifications_enabled: boolean;
          total_points: number;
          level: number;
          streak_current: number;
          streak_best: number;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
          // Sprint 8 fields
          daily_intention: string | null;
          last_daily_planning_at: string | null;
          last_shutdown_at: string | null;
          planning_preferences: Record<string, unknown> | null;
          focus_sound: string;
          focus_sound_volume: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: "dark" | "light" | "system";
          default_focus_minutes?: number;
          short_break_minutes?: number;
          long_break_minutes?: number;
          sessions_before_long_break?: number;
          sound_enabled?: boolean;
          notifications_enabled?: boolean;
          total_points?: number;
          level?: number;
          streak_current?: number;
          streak_best?: number;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
          // Sprint 8 fields
          daily_intention?: string | null;
          last_daily_planning_at?: string | null;
          last_shutdown_at?: string | null;
          planning_preferences?: Record<string, unknown> | null;
          focus_sound?: string;
          focus_sound_volume?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: "dark" | "light" | "system";
          default_focus_minutes?: number;
          short_break_minutes?: number;
          long_break_minutes?: number;
          sessions_before_long_break?: number;
          sound_enabled?: boolean;
          notifications_enabled?: boolean;
          total_points?: number;
          level?: number;
          streak_current?: number;
          streak_best?: number;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
          // Sprint 8 fields
          daily_intention?: string | null;
          last_daily_planning_at?: string | null;
          last_shutdown_at?: string | null;
          planning_preferences?: Record<string, unknown> | null;
          focus_sound?: string;
          focus_sound_volume?: number;
        };
        Relationships: [];
      };
      zeroed_daily_stats: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          tasks_completed: number;
          tasks_created: number;
          focus_minutes: number;
          sessions_completed: number;
          estimated_minutes: number;
          actual_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          tasks_completed?: number;
          tasks_created?: number;
          focus_minutes?: number;
          sessions_completed?: number;
          estimated_minutes?: number;
          actual_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          tasks_completed?: number;
          tasks_created?: number;
          focus_minutes?: number;
          sessions_completed?: number;
          estimated_minutes?: number;
          actual_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      zeroed_tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      zeroed_task_tags: {
        Row: {
          task_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          task_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          task_id?: string;
          tag_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zeroed_task_tags_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "zeroed_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "zeroed_task_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "zeroed_tags";
            referencedColumns: ["id"];
          }
        ];
      };
      zeroed_saved_filters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          filter_config: FilterConfig;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color?: string;
          filter_config: FilterConfig;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          color?: string;
          filter_config?: FilterConfig;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Sprint 2: View Preferences
      zeroed_view_preferences: {
        Row: {
          id: string;
          user_id: string;
          list_id: string | null;
          view_type: "list" | "kanban" | "calendar" | "table";
          kanban_group_by: "status" | "priority" | "list";
          calendar_color_by: "list" | "priority";
          table_columns: string[];
          table_sort_column: string;
          table_sort_direction: "asc" | "desc";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          list_id?: string | null;
          view_type?: "list" | "kanban" | "calendar" | "table";
          kanban_group_by?: "status" | "priority" | "list";
          calendar_color_by?: "list" | "priority";
          table_columns?: string[];
          table_sort_column?: string;
          table_sort_direction?: "asc" | "desc";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          list_id?: string | null;
          view_type?: "list" | "kanban" | "calendar" | "table";
          kanban_group_by?: "status" | "priority" | "list";
          calendar_color_by?: "list" | "priority";
          table_columns?: string[];
          table_sort_column?: string;
          table_sort_direction?: "asc" | "desc";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Sprint 3: Goals
      zeroed_goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          target_type: "tasks_completed" | "focus_minutes" | "focus_sessions" | "streak_days" | "custom";
          target_value: number;
          current_value: number;
          period: "daily" | "weekly" | "monthly" | "yearly" | "total";
          start_date: string;
          end_date: string | null;
          status: "active" | "completed" | "failed" | "paused";
          completed_at: string | null;
          color: string;
          icon: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          target_type: "tasks_completed" | "focus_minutes" | "focus_sessions" | "streak_days" | "custom";
          target_value: number;
          current_value?: number;
          period: "daily" | "weekly" | "monthly" | "yearly" | "total";
          start_date?: string;
          end_date?: string | null;
          status?: "active" | "completed" | "failed" | "paused";
          completed_at?: string | null;
          color?: string;
          icon?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          target_type?: "tasks_completed" | "focus_minutes" | "focus_sessions" | "streak_days" | "custom";
          target_value?: number;
          current_value?: number;
          period?: "daily" | "weekly" | "monthly" | "yearly" | "total";
          start_date?: string;
          end_date?: string | null;
          status?: "active" | "completed" | "failed" | "paused";
          completed_at?: string | null;
          color?: string;
          icon?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Sprint 3: Habits
      zeroed_habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          icon: string;
          color: string;
          frequency: "daily" | "weekdays" | "weekends" | "custom";
          frequency_days: number[];
          reminder_time: string | null;
          target_per_day: number;
          streak_current: number;
          streak_best: number;
          total_completions: number;
          is_archived: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          icon?: string;
          color?: string;
          frequency?: "daily" | "weekdays" | "weekends" | "custom";
          frequency_days?: number[];
          reminder_time?: string | null;
          target_per_day?: number;
          streak_current?: number;
          streak_best?: number;
          total_completions?: number;
          is_archived?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          icon?: string;
          color?: string;
          frequency?: "daily" | "weekdays" | "weekends" | "custom";
          frequency_days?: number[];
          reminder_time?: string | null;
          target_per_day?: number;
          streak_current?: number;
          streak_best?: number;
          total_completions?: number;
          is_archived?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Sprint 3: Habit Logs
      zeroed_habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          date: string;
          completed_count: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          date: string;
          completed_count?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          habit_id?: string;
          user_id?: string;
          date?: string;
          completed_count?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zeroed_habit_logs_habit_id_fkey";
            columns: ["habit_id"];
            isOneToOne: false;
            referencedRelation: "zeroed_habits";
            referencedColumns: ["id"];
          }
        ];
      };
      // Sprint 3: Achievements
      zeroed_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          achievement_tier: number;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_type: string;
          achievement_tier?: number;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_type?: string;
          achievement_tier?: number;
          earned_at?: string;
        };
        Relationships: [];
      };
      // Sprint 3: Points History
      zeroed_points_history: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          reason: string;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points: number;
          reason: string;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          points?: number;
          reason?: string;
          reference_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // Sprint 5: Task Templates
      zeroed_task_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          icon: string;
          is_public: boolean;
          use_count: number;
          task_data: Json;
          subtasks: Json | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          icon?: string;
          is_public?: boolean;
          use_count?: number;
          task_data: Json;
          subtasks?: Json | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          icon?: string;
          is_public?: boolean;
          use_count?: number;
          task_data?: Json;
          subtasks?: Json | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Sprint 5: Project Templates
      zeroed_project_templates: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          icon: string;
          color: string;
          category: string | null;
          is_public: boolean;
          use_count: number;
          list_data: Json;
          tasks: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          icon?: string;
          color?: string;
          category?: string | null;
          is_public?: boolean;
          use_count?: number;
          list_data: Json;
          tasks: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          description?: string | null;
          icon?: string;
          color?: string;
          category?: string | null;
          is_public?: boolean;
          use_count?: number;
          list_data?: Json;
          tasks?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      // Sprint 6: Time Entries
      zeroed_time_entries: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          description: string | null;
          start_time: string;
          end_time: string | null;
          duration_minutes: number;
          is_manual: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          description?: string | null;
          start_time: string;
          end_time?: string | null;
          duration_minutes?: number;
          is_manual?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          description?: string | null;
          start_time?: string;
          end_time?: string | null;
          duration_minutes?: number;
          is_manual?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zeroed_time_entries_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "zeroed_tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      // Sprint 6: Saved Reports
      zeroed_saved_reports: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          report_type: "productivity" | "time" | "goals" | "custom";
          config: Json;
          schedule: "daily" | "weekly" | "monthly" | null;
          last_generated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          report_type: "productivity" | "time" | "goals" | "custom";
          config?: Json;
          schedule?: "daily" | "weekly" | "monthly" | null;
          last_generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          report_type?: "productivity" | "time" | "goals" | "custom";
          config?: Json;
          schedule?: "daily" | "weekly" | "monthly" | null;
          last_generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Sprint 6: Weekly Stats
      zeroed_weekly_stats: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          tasks_completed: number;
          tasks_created: number;
          focus_minutes: number;
          sessions_completed: number;
          most_productive_day: string | null;
          avg_tasks_per_day: number;
          avg_focus_per_day: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          tasks_completed?: number;
          tasks_created?: number;
          focus_minutes?: number;
          sessions_completed?: number;
          most_productive_day?: string | null;
          avg_tasks_per_day?: number;
          avg_focus_per_day?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
          tasks_completed?: number;
          tasks_created?: number;
          focus_minutes?: number;
          sessions_completed?: number;
          most_productive_day?: string | null;
          avg_tasks_per_day?: number;
          avg_focus_per_day?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Sprint 8: Smart Filters
      zeroed_smart_filters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          filter_config: Json;
          position: number;
          is_pinned: boolean;
          use_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color?: string;
          filter_config: Json;
          position?: number;
          is_pinned?: boolean;
          use_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          color?: string;
          filter_config?: Json;
          position?: number;
          is_pinned?: boolean;
          use_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Sprint 8: Archive
      zeroed_archive: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          title: string;
          notes: string | null;
          list_name: string | null;
          list_color: string | null;
          priority: string | null;
          tags: string[] | null;
          estimated_minutes: number | null;
          actual_minutes: number | null;
          completed_at: string;
          created_at: string | null;
          focus_sessions_count: number;
          focus_total_minutes: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          title: string;
          notes?: string | null;
          list_name?: string | null;
          list_color?: string | null;
          priority?: string | null;
          tags?: string[] | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          completed_at: string;
          created_at?: string | null;
          focus_sessions_count?: number;
          focus_total_minutes?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string;
          title?: string;
          notes?: string | null;
          list_name?: string | null;
          list_color?: string | null;
          priority?: string | null;
          tags?: string[] | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          completed_at?: string;
          created_at?: string | null;
          focus_sessions_count?: number;
          focus_total_minutes?: number;
        };
        Relationships: [];
      };
      // Sprint 8: Undo History
      zeroed_undo_history: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          entity_type: string;
          entity_id: string;
          previous_state: Json;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          entity_type: string;
          entity_id: string;
          previous_state: Json;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          entity_type?: string;
          entity_id?: string;
          previous_state?: Json;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      zeroed_increment_daily_stat: {
        Args: {
          p_user_id: string;
          p_date: string;
          p_field: string;
          p_value?: number;
        };
        Returns: undefined;
      };
      zeroed_get_subtask_progress: {
        Args: {
          task_uuid: string;
        };
        Returns: { total: number; completed: number }[];
      };
      zeroed_next_occurrence: {
        Args: {
          p_rule: Json;
          p_current_date: string;
        };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Insertable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updateable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type List = Tables<"zeroed_lists">;
export type Task = Tables<"zeroed_tasks">;
export type FocusSession = Tables<"zeroed_focus_sessions">;
export type UserPreferences = Tables<"zeroed_user_preferences">;
export type DailyStats = Tables<"zeroed_daily_stats">;
export type Tag = Tables<"zeroed_tags">;
export type TaskTag = Tables<"zeroed_task_tags">;
export type SavedFilter = Tables<"zeroed_saved_filters">;
// Sprint 2-6 table types
export type ViewPreferencesRow = Tables<"zeroed_view_preferences">;
export type GoalRow = Tables<"zeroed_goals">;
export type HabitRow = Tables<"zeroed_habits">;
export type HabitLogRow = Tables<"zeroed_habit_logs">;
export type AchievementRow = Tables<"zeroed_achievements">;
export type PointsHistoryRow = Tables<"zeroed_points_history">;
export type TaskTemplateRow = Tables<"zeroed_task_templates">;
export type ProjectTemplateRow = Tables<"zeroed_project_templates">;
export type TimeEntryRow = Tables<"zeroed_time_entries">;
export type SavedReportRow = Tables<"zeroed_saved_reports">;
export type WeeklyStatsRow = Tables<"zeroed_weekly_stats">;

// Extended task type with relations
export interface TaskWithRelations extends Task {
  zeroed_lists?: { name: string; color: string } | null;
  zeroed_tags?: Tag[];
  subtasks?: Task[];
  subtask_progress?: { total: number; completed: number };
}

// ============================================================================
// SPRINT 2: VIEW TYPES
// ============================================================================

export type ViewType = 'list' | 'kanban' | 'calendar' | 'table';
export type KanbanGroupBy = 'status' | 'priority' | 'list';

export interface ViewPreferences {
  id: string;
  user_id: string;
  list_id: string | null;
  view_type: ViewType;
  kanban_group_by: KanbanGroupBy;
  calendar_color_by: 'list' | 'priority';
  table_columns: string[];
  table_sort_column: string;
  table_sort_direction: 'asc' | 'desc';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SPRINT 3: GOALS, HABITS, GAMIFICATION TYPES
// ============================================================================

export type GoalTargetType = 'tasks_completed' | 'focus_minutes' | 'focus_sessions' | 'streak_days' | 'custom';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'total';
export type GoalStatus = 'active' | 'completed' | 'failed' | 'paused';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_type: GoalTargetType;
  target_value: number;
  current_value: number;
  period: GoalPeriod;
  start_date: string;
  end_date: string | null;
  status: GoalStatus;
  completed_at: string | null;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  frequency_days: number[];
  reminder_time: string | null;
  target_per_day: number;
  streak_current: number;
  streak_best: number;
  total_completions: number;
  is_archived: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  completed_count: number;
  notes: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_tier: number;
  earned_at: string;
}

export interface PointsHistory {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

// ============================================================================
// SPRINT 5: TEMPLATE TYPES
// ============================================================================

export interface TaskTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  is_public: boolean;
  use_count: number;
  task_data: {
    title: string;
    notes?: string;
    priority?: string;
    estimated_minutes?: number;
  };
  subtasks: Array<{ title: string; estimated_minutes: number }> | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplate {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: string | null;
  is_public: boolean;
  use_count: number;
  list_data: { name: string; color: string };
  tasks: Array<{ title: string; estimated_minutes?: number; priority?: string }>;
  created_at: string;
}

// ============================================================================
// SPRINT 6: ANALYTICS & TIME TRACKING TYPES
// ============================================================================

export interface TimeEntry {
  id: string;
  user_id: string;
  task_id: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  is_manual: boolean;
  created_at: string;
}

export interface SavedReport {
  id: string;
  user_id: string;
  name: string;
  report_type: 'productivity' | 'time' | 'goals' | 'custom';
  config: Record<string, unknown>;
  schedule: 'daily' | 'weekly' | 'monthly' | null;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyStats {
  id: string;
  user_id: string;
  week_start: string;
  tasks_completed: number;
  tasks_created: number;
  focus_minutes: number;
  sessions_completed: number;
  most_productive_day: string | null;
  avg_tasks_per_day: number;
  avg_focus_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface ProductivityMetrics {
  tasksCompleted: number;
  tasksCreated: number;
  completionRate: number;
  focusMinutes: number;
  sessionsCompleted: number;
  avgTaskDuration: number;
  estimationAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  tasksCompletedTrend: number;
  focusMinutesTrend: number;
}

export interface DailyBreakdown {
  date: string;
  tasksCompleted: number;
  focusMinutes: number;
  sessionsCompleted: number;
}

export interface HourlyDistribution {
  hour: number;
  tasksCompleted: number;
  focusMinutes: number;
}

export interface CategoryBreakdown {
  listId: string;
  listName: string;
  color: string;
  tasksCompleted: number;
  focusMinutes: number;
  percentage: number;
}

// ============================================================================
// SPRINT 8: SMART FILTERS, SNOOZE, RITUALS
// ============================================================================

export interface FilterCondition {
  field: 'priority' | 'status' | 'list_id' | 'due_date' | 'start_date' | 'tags' | 'estimated_minutes' | 'has_subtasks' | 'is_recurring';
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'is_null' | 'is_not_null' | 'contains';
  value: unknown;
}

export interface SmartFilterConfig {
  conditions: FilterCondition[];
  logic: 'and' | 'or';
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface SmartFilter {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  filter_config: SmartFilterConfig;
  position: number;
  is_pinned: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface ArchivedTask {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  notes: string | null;
  list_name: string | null;
  list_color: string | null;
  priority: string | null;
  tags: string[] | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  completed_at: string;
  created_at: string | null;
  focus_sessions_count: number;
  focus_total_minutes: number;
}

export interface UndoAction {
  id: string;
  user_id: string;
  action_type: 'complete' | 'delete' | 'snooze' | 'move' | 'update';
  entity_type: 'task' | 'list';
  entity_id: string;
  previous_state: Record<string, unknown>;
  created_at: string;
  expires_at: string;
}

export interface PlanningPreferences {
  autoShowMorning: boolean;
  autoShowEvening: boolean;
  morningTime: string;
  eveningTime: string;
}

export type FocusSoundType = 'none' | 'rain' | 'cafe' | 'lofi' | 'whitenoise' | 'nature';

// Preset filters
export const PRESET_FILTERS: Record<string, SmartFilterConfig> = {
  'high-priority': {
    conditions: [
      { field: 'priority', operator: 'in', value: ['high', 'urgent'] },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
    sort: { field: 'priority', direction: 'desc' },
  },
  'due-this-week': {
    conditions: [
      { field: 'due_date', operator: 'gte', value: 'today' },
      { field: 'due_date', operator: 'lte', value: 'end_of_week' },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
    sort: { field: 'due_date', direction: 'asc' },
  },
  'overdue': {
    conditions: [
      { field: 'due_date', operator: 'lt', value: 'today' },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
    sort: { field: 'due_date', direction: 'asc' },
  },
  'no-due-date': {
    conditions: [
      { field: 'due_date', operator: 'is_null', value: null },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
  },
  'quick-wins': {
    conditions: [
      { field: 'estimated_minutes', operator: 'lte', value: 15 },
      { field: 'status', operator: 'neq', value: 'completed' },
    ],
    logic: 'and',
    sort: { field: 'estimated_minutes', direction: 'asc' },
  },
};
