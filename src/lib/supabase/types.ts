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
      items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          icon: string | null;
          cadence_days: number;
          notifications_enabled: boolean;
          notify_email: boolean;
          notify_strong: boolean;
          threshold_primary: number;
          threshold_strong: number;
          notes: string | null;
          next_fire_at_primary: string | null;
          next_fire_at_strong: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category?: string;
          icon?: string | null;
          cadence_days?: number;
          notifications_enabled?: boolean;
          notify_email?: boolean;
          notify_strong?: boolean;
          threshold_primary?: number;
          threshold_strong?: number;
          notes?: string | null;
          next_fire_at_primary?: string | null;
          next_fire_at_strong?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?: string;
          icon?: string | null;
          cadence_days?: number;
          notifications_enabled?: boolean;
          notify_email?: boolean;
          notify_strong?: boolean;
          threshold_primary?: number;
          threshold_strong?: number;
          notes?: string | null;
          next_fire_at_primary?: string | null;
          next_fire_at_strong?: string | null;
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
          at: string;
          satisfaction: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          at?: string;
          satisfaction?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          at?: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          primary_threshold_default?: number;
          strong_threshold_default?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          primary_threshold_default?: number;
          strong_threshold_default?: number;
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
          delivered: boolean;
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
          delivered?: boolean;
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
          delivered?: boolean;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}


