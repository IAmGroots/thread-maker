import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rowToThread, type SavedThreadRow } from "@/lib/storage/threads";
import type { SavedThread } from "@/types/thread";

type Client = SupabaseClient<Database>;

export interface LibraryPage {
  threads: SavedThread[];
  total: number;
  hasMore: boolean;
}

/** Escape LIKE wildcards so a search for "100%" does not match everything. */
export function buildSearchPattern(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

type SearchRow = SavedThreadRow & { total_count: number | string };

/**
 * Server-side page of the saved library. Search runs in SQL so the browser
 * never has to download the whole library to filter it, and tweet text is
 * searchable too.
 */
export async function listLibraryPage(
  client: Client,
  workspaceId: string,
  options: { query?: string; limit?: number; offset?: number } = {},
): Promise<LibraryPage> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);
  const query = options.query?.trim() ?? "";

  const { data, error } = await client.rpc("search_saved_threads", {
    p_workspace: workspaceId,
    p_query: buildSearchPattern(query),
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as SearchRow[];
  const threads = rows.map((row) => rowToThread(row));
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return {
    threads,
    total,
    hasMore: offset + threads.length < total,
  };
}
