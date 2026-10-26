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

export type TargetStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "partial"
  | "failed"
  | "canceled";

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
          workspace_id: string | null;
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
          workspace_id?: string | null;
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
          workspace_id?: string | null;
          threads_user_id?: string;
          username?: string;
          access_token?: string;
          token_expires_at?: string | null;
          is_active?: boolean;
          connected_at?: string;
        };
        Relationships: [];
      };
      saved_threads: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string | null;
          topic: string;
          format: string;
          style: string;
          tone: string;
          language: string;
          target_audience: string;
          content_goal: string;
          tweets: Json;
          settings: Json;
          affiliate: Json | null;
          total_tweets: number;
          total_chars: number;
          is_favorite: boolean;
          tags: Json;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id?: string | null;
          topic?: string;
          format?: string;
          style?: string;
          tone?: string;
          language?: string;
          target_audience?: string;
          content_goal?: string;
          tweets?: Json;
          settings?: Json;
          affiliate?: Json | null;
          total_tweets?: number;
          total_chars?: number;
          is_favorite?: boolean;
          tags?: Json;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string | null;
          topic?: string;
          format?: string;
          style?: string;
          tone?: string;
          language?: string;
          target_audience?: string;
          content_goal?: string;
          tweets?: Json;
          settings?: Json;
          affiliate?: Json | null;
          total_tweets?: number;
          total_chars?: number;
          is_favorite?: boolean;
          tags?: Json;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      thread_publishes: {
        Row: {
          id: string;
          user_id: string;
          saved_thread_id: string | null;
          threads_account_id: string | null;
          status: PostStatus;
          threads_post_id: string | null;
          reply_chain: Json;
          error_message: string | null;
          published_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          saved_thread_id?: string | null;
          threads_account_id?: string | null;
          status?: PostStatus;
          threads_post_id?: string | null;
          reply_chain?: Json;
          error_message?: string | null;
          published_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          saved_thread_id?: string | null;
          threads_account_id?: string | null;
          status?: PostStatus;
          threads_post_id?: string | null;
          reply_chain?: Json;
          error_message?: string | null;
          published_at?: string;
        };
        Relationships: [];
      };
      scheduled_posts: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string | null;
          threads_account_id: string | null;
          saved_thread_id: string | null;
          reply_chain: Json;
          scheduled_for: string | null;
          status: PostStatus;
          threads_post_id: string | null;
          error_message: string | null;
          published_at: string | null;
          attempts: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id?: string | null;
          threads_account_id?: string | null;
          saved_thread_id?: string | null;
          reply_chain?: Json;
          scheduled_for?: string | null;
          status?: PostStatus;
          threads_post_id?: string | null;
          error_message?: string | null;
          published_at?: string | null;
          attempts?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string | null;
          threads_account_id?: string | null;
          saved_thread_id?: string | null;
          reply_chain?: Json;
          scheduled_for?: string | null;
          status?: PostStatus;
          threads_post_id?: string | null;
          error_message?: string | null;
          published_at?: string | null;
          attempts?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          timezone: string;
          plan: string;
          trial_used: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          slug: string;
          timezone?: string;
          plan?: string;
          trial_used?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          timezone?: string;
          plan?: string;
          trial_used?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      social_accounts: {
        Row: {
          id: string;
          workspace_id: string;
          provider: string;
          provider_account_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          access_token_enc: string | null;
          refresh_token_enc: string | null;
          token_expires_at: string | null;
          scopes: string[];
          status: string;
          metadata: Json;
          connected_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          provider: string;
          provider_account_id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          access_token_enc: string | null;
          refresh_token_enc?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          status?: string;
          metadata?: Json;
          connected_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          provider?: string;
          provider_account_id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          access_token_enc?: string | null;
          refresh_token_enc?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          status?: string;
          metadata?: Json;
          connected_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_items: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string | null;
          title: string;
          base_text: string;
          status: string;
          tags: Json;
          metadata: Json;
          legacy_saved_thread_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by?: string | null;
          title?: string;
          base_text?: string;
          status?: string;
          tags?: Json;
          metadata?: Json;
          legacy_saved_thread_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          created_by?: string | null;
          title?: string;
          base_text?: string;
          status?: string;
          tags?: Json;
          metadata?: Json;
          legacy_saved_thread_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_segments: {
        Row: {
          id: string;
          content_item_id: string;
          position: number;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_item_id: string;
          position: number;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          content_item_id?: string;
          position?: number;
          text?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      media_assets: {
        Row: {
          id: string;
          workspace_id: string;
          storage_path: string;
          mime_type: string;
          width: number | null;
          height: number | null;
          duration_ms: number | null;
          size_bytes: number;
          alt_text: string | null;
          checksum: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          storage_path: string;
          mime_type: string;
          width?: number | null;
          height?: number | null;
          duration_ms?: number | null;
          size_bytes: number;
          alt_text?: string | null;
          checksum?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          storage_path?: string;
          mime_type?: string;
          width?: number | null;
          height?: number | null;
          duration_ms?: number | null;
          size_bytes?: number;
          alt_text?: string | null;
          checksum?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      post_targets: {
        Row: {
          id: string;
          workspace_id: string;
          content_item_id: string;
          social_account_id: string;
          scheduled_for: string;
          timezone: string;
          status: TargetStatus;
          content_override: Json;
          idempotency_key: string;
          provider_post_id: string | null;
          provider_url: string | null;
          provider_state: Json;
          checkpoint: number;
          attempts: number;
          next_attempt_at: string | null;
          locked_at: string | null;
          error_code: string | null;
          error_message: string | null;
          published_at: string | null;
          legacy_scheduled_post_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          content_item_id: string;
          social_account_id: string;
          scheduled_for?: string;
          timezone?: string;
          status?: TargetStatus;
          content_override?: Json;
          idempotency_key: string;
          provider_post_id?: string | null;
          provider_url?: string | null;
          provider_state?: Json;
          checkpoint?: number;
          attempts?: number;
          next_attempt_at?: string | null;
          locked_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          published_at?: string | null;
          legacy_scheduled_post_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          content_item_id?: string;
          social_account_id?: string;
          scheduled_for?: string;
          timezone?: string;
          status?: TargetStatus;
          content_override?: Json;
          idempotency_key?: string;
          provider_post_id?: string | null;
          provider_url?: string | null;
          provider_state?: Json;
          checkpoint?: number;
          attempts?: number;
          next_attempt_at?: string | null;
          locked_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          published_at?: string | null;
          legacy_scheduled_post_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      post_target_media: {
        Row: {
          post_target_id: string;
          media_asset_id: string;
          position: number;
        };
        Insert: {
          post_target_id: string;
          media_asset_id: string;
          position?: number;
        };
        Update: {
          post_target_id?: string;
          media_asset_id?: string;
          position?: number;
        };
        Relationships: [];
      };
      publish_attempts: {
        Row: {
          id: string;
          post_target_id: string;
          attempt: number;
          status: string;
          request_id: string | null;
          response: Json | null;
          error_code: string | null;
          error_message: string | null;
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          post_target_id: string;
          attempt: number;
          status: string;
          request_id?: string | null;
          response?: Json | null;
          error_code?: string | null;
          error_message?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          post_target_id?: string;
          attempt?: number;
          status?: string;
          request_id?: string | null;
          response?: Json | null;
          error_code?: string | null;
          error_message?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Relationships: [];
      };
      analytics_snapshots: {
        Row: {
          id: string;
          workspace_id: string;
          social_account_id: string;
          provider_post_id: string;
          post_target_id: string | null;
          captured_at: string;
          views: number | null;
          likes: number | null;
          comments: number | null;
          shares: number | null;
          quotes: number | null;
          engagement_rate: number | null;
          raw: Json;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          social_account_id: string;
          provider_post_id: string;
          post_target_id?: string | null;
          captured_at?: string;
          views?: number | null;
          likes?: number | null;
          comments?: number | null;
          shares?: number | null;
          quotes?: number | null;
          engagement_rate?: number | null;
          raw?: Json;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          social_account_id?: string;
          provider_post_id?: string;
          post_target_id?: string | null;
          captured_at?: string;
          views?: number | null;
          likes?: number | null;
          comments?: number | null;
          shares?: number | null;
          quotes?: number | null;
          engagement_rate?: number | null;
          raw?: Json;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          entity_type: string | null;
          entity_id: string | null;
          read_at: string | null;
          created_at: string;
          params: Json;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          read_at?: string | null;
          created_at?: string;
          params?: Json;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          read_at?: string | null;
          created_at?: string;
          params?: Json;
        };
        Relationships: [];
      };
      usage_counters: {
        Row: {
          workspace_id: string;
          period: string;
          metric: string;
          value: number;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          period: string;
          metric: string;
          value?: number;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          period?: string;
          metric?: string;
          value?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          provider: string;
          plan: string;
          billing_period: string;
          status: string;
          current_period_start: string;
          current_period_end: string;
          grace_until: string | null;
          reminder_7_sent_at: string | null;
          reminder_1_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          provider?: string;
          plan: string;
          billing_period?: string;
          status?: string;
          current_period_start?: string;
          current_period_end: string;
          grace_until?: string | null;
          reminder_7_sent_at?: string | null;
          reminder_1_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          provider?: string;
          plan?: string;
          billing_period?: string;
          status?: string;
          current_period_start?: string;
          current_period_end?: string;
          grace_until?: string | null;
          reminder_7_sent_at?: string | null;
          reminder_1_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          workspace_id: string;
          order_id: string;
          plan: string;
          billing_period: string;
          amount: number;
          status: string;
          provider: string;
          provider_txn_id: string | null;
          payment_link: string | null;
          qr_string: string | null;
          va_number: string | null;
          payment_method: string | null;
          expires_at: string | null;
          paid_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          order_id: string;
          plan: string;
          billing_period?: string;
          amount: number;
          status?: string;
          provider?: string;
          provider_txn_id?: string | null;
          payment_link?: string | null;
          qr_string?: string | null;
          va_number?: string | null;
          payment_method?: string | null;
          expires_at?: string | null;
          paid_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          order_id?: string;
          plan?: string;
          billing_period?: string;
          amount?: number;
          status?: string;
          provider?: string;
          provider_txn_id?: string | null;
          payment_link?: string | null;
          qr_string?: string | null;
          va_number?: string | null;
          payment_method?: string | null;
          expires_at?: string | null;
          paid_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_events: {
        Row: {
          id: string;
          provider: string;
          provider_txn_id: string;
          order_id: string;
          amount: number;
          status: string;
          is_sandbox: boolean;
          payload: Json;
          processed_at: string;
        };
        Insert: {
          id?: string;
          provider?: string;
          provider_txn_id: string;
          order_id: string;
          amount: number;
          status: string;
          is_sandbox?: boolean;
          payload?: Json;
          processed_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          provider_txn_id?: string;
          order_id?: string;
          amount?: number;
          status?: string;
          is_sandbox?: boolean;
          payload?: Json;
          processed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      plan_price: {
        Args: { p_plan: string; p_period?: string };
        Returns: number;
      };
      apply_paid_invoice: {
        Args: {
          p_order_id: string;
          p_txn_id: string;
          p_amount: number;
          p_is_sandbox: boolean;
          p_payload?: Json;
        };
        Returns: string;
      };
      expire_due_subscriptions: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_expiry_reminders: {
        Args: Record<string, never>;
        Returns: number;
      };
      start_creator_trial: {
        Args: Record<string, never>;
        Returns: string;
      };
      cancel_subscription: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      consume_usage: {
        Args: {
          p_workspace: string;
          p_period: string;
          p_metric: string;
          p_amount: number;
        };
        Returns: number | null;
      };
      create_post_target: {
        Args: {
          p_workspace: string;
          p_content_item: string;
          p_social_account: string;
          p_scheduled_for: string;
          p_timezone: string;
          p_idempotency_key: string;
          p_segments: Json;
          p_media?: string | null;
          p_consume?: boolean;
        };
        Returns: string;
      };
      prune_expired_data: {
        Args: Record<string, never>;
        Returns: number;
      };

      media_usage_bytes: {
        Args: { p_workspace: string };
        Returns: number;
      };
      search_saved_threads: {
        Args: {
          p_workspace: string;
          p_query: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          topic: string;
          format: string;
          style: string;
          tone: string;
          language: string;
          target_audience: string;
          content_goal: string;
          tweets: Json;
          settings: Json;
          affiliate: Json | null;
          total_tweets: number;
          total_chars: number;
          is_favorite: boolean;
          tags: Json;
          notes: string;
          created_at: string;
          updated_at: string;
          total_count: number;
        }>;
      };
      refund_usage: {
        Args: {
          p_workspace: string;
          p_period: string;
          p_metric: string;
          p_amount: number;
        };
        Returns: undefined;
      };
      ensure_personal_workspace: {
        Args: Record<string, never>;
        Returns: string;
      };
      claim_post_targets: {
        Args: { p_limit?: number };
        Returns: Array<{
          id: string;
          workspace_id: string;
          content_item_id: string;
          social_account_id: string;
          provider: string;
          scheduled_for: string;
          attempts: number;
          checkpoint: number;
          provider_state: Json;
          content_override: Json;
        }>;
      };
      claim_post_target: {
        Args: { p_id: string };
        Returns: Array<{
          id: string;
          workspace_id: string;
          content_item_id: string;
          social_account_id: string;
          provider: string;
          scheduled_for: string;
          attempts: number;
          checkpoint: number;
          provider_state: Json;
          content_override: Json;
        }>;
      };
      complete_post_target: {
        Args: { p_id: string; p_result: Json };
        Returns: undefined;
      };
      fail_post_target: {
        Args: {
          p_id: string;
          p_code: string;
          p_message: string;
          p_retry_at?: string | null;
          p_checkpoint?: number | null;
        };
        Returns: undefined;
      };
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
