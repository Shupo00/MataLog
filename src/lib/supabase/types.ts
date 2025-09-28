export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          icon: string | null;
          cadence_mode: "adaptive" | "fixed" | "window";
          tau_days: number | null;
          fixed_days: number | null;
          window_center_days: number | null;
          window_width_days: number | null;
          notifications_enabled: boolean;
          notify_web_push: boolean;
          notify_email: boolean;
          threshold_primary: number;
          threshold_strong: number;
          snooze: "none" | "day" | "week" | "month";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category?: string;
          icon?: string | null;
          cadence_mode?: "adaptive" | "fixed" | "window";
          tau_days?: number | null;
          fixed_days?: number | null;
          window_center_days?: number | null;
          window_width_days?: number | null;
          notifications_enabled?: boolean;
          notify_web_push?: boolean;
          notify_email?: boolean;
          threshold_primary?: number;
          threshold_strong?: number;
          snooze?: "none" | "day" | "week" | "month";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?: string;
          icon?: string | null;
          cadence_mode?: "adaptive" | "fixed" | "window";
          tau_days?: number | null;
          fixed_days?: number | null;
          window_center_days?: number | null;
          window_width_days?: number | null;
          notifications_enabled?: boolean;
          notify_web_push?: boolean;
          notify_email?: boolean;
          threshold_primary?: number;
          threshold_strong?: number;
          snooze?: "none" | "day" | "week" | "month";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      logs: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          logged_at: string;
          satisfaction: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          logged_at?: string;
          satisfaction?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          logged_at?: string;
          satisfaction?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "logs_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "items";
            referencedColumns: ["id"];
          }
        ];
      };
      preferences: {
        Row: {
          user_id: string;
          primary_threshold_default: number;
          strong_threshold_default: number;
          notify_hour_start: number;
          notify_hour_end: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          primary_threshold_default?: number;
          strong_threshold_default?: number;
          notify_hour_start?: number;
          notify_hour_end?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          primary_threshold_default?: number;
          strong_threshold_default?: number;
          notify_hour_start?: number;
          notify_hour_end?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          channel: "webpush" | "email";
          level: "primary" | "strong";
          score: number | null;
          send_at: string;
          delivered_at: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          channel: "webpush" | "email";
          level: "primary" | "strong";
          score?: number | null;
          send_at: string;
          delivered_at?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          channel?: "webpush" | "email";
          level?: "primary" | "strong";
          score?: number | null;
          send_at?: string;
          delivered_at?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "items";
            referencedColumns: ["id"];
          }
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}