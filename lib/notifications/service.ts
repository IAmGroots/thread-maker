import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type Client = SupabaseClient<Database>;

export type NotificationType =
  | "publish_succeeded"
  | "publish_failed"
  | "publish_partial"
  | "account_error"
  | "system";

export interface CreateNotificationInput {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  /** English fallback; the UI renders from `params` when it can. */
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  /** Structured values the client renders in its own language. */
  params?: Record<string, unknown>;
}

/**
 * Notifications are best effort: a failure to record one must never break a
 * publish, so callers get a boolean instead of an exception.
 */
export async function createNotification(
  client: Client,
  input: CreateNotificationInput,
): Promise<boolean> {
  const { error } = await client.from("notifications").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    params: (input.params ?? {}) as unknown as Json,
  });

  if (error) {
    console.warn(`[notifications] insert failed: ${error.message}`);
    return false;
  }

  return true;
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  params: Record<string, unknown>;
}

export async function listNotifications(
  client: Client,
  userId: string,
  limit = 20,
): Promise<NotificationRow[]> {
  const { data, error } = await client
    .from("notifications")
    .select("id, type, title, body, entity_type, entity_id, read_at, created_at, params")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    params: (row.params ?? {}) as Record<string, unknown>,
  }));
}

export async function countUnreadNotifications(
  client: Client,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationsRead(
  client: Client,
  userId: string,
  ids?: string[],
): Promise<void> {
  let query = client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (ids && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);
}
