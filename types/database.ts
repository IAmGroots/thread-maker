export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "partial_published"
  | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      threads_accounts: {
        Row: {
          id: string;
          user_id: string;
          threads_user_id: string;
          username: string;
          access_token: string;
          token_expires_at: string | null;
          is_active: boolean;
          connected_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          threads_user_id: string;
          username: string;
          access_token: string;
          token_expires_at?: string | null;
          is_active?: boolean;
          connected_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          threads_user_id?: string;
          username?: string;
          access_token?: string;
          token_expires_at?: string | null;
          is_active?: boolean;
          connected_at?: string;
        };
        Relationships: [];
      };
      scheduled_posts: {
        Row: {
          id: string;
          user_id: string;
          threads_account_id: string | null;
          reply_chain: Json;
          scheduled_for: string | null;
          status: PostStatus;
          threads_post_id: string | null;
          error_message: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          threads_account_id?: string | null;
          reply_chain?: Json;
          scheduled_for?: string | null;
          status?: PostStatus;
          threads_post_id?: string | null;
          error_message?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          threads_account_id?: string | null;
          reply_chain?: Json;
          scheduled_for?: string | null;
          status?: PostStatus;
          threads_post_id?: string | null;
          error_message?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
