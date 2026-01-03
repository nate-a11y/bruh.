export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
        };
        Relationships: [
          {
            foreignKeyName: "zeroed_tasks_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "zeroed_lists";
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
          created_at: string;
          updated_at: string;
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
          created_at?: string;
          updated_at?: string;
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
          created_at?: string;
          updated_at?: string;
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
