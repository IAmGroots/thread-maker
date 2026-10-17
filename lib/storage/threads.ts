import { createClient } from "@/lib/supabase/client";
import type { SavedThread, Tweet } from "@/types/thread";
import type { Database, Json } from "@/types/database";

type SavedThreadUpdate = Database["public"]["Tables"]["saved_threads"]["Update"];

/**
 * Supabase-backed storage for the saved thread library.
 *
 * Replaces the localStorage store (`lib/storage/localStorage.ts`): threads are
 * owned by the user and synced across devices. Requires an authenticated user;
 * RLS scopes every row to `auth.uid()`.
 *
 * The pure helpers that do not touch storage (slugify, export formatting,
 * import parsing, download) still live in `localStorage.ts` and are re-exported
 * here so callers have a single import path.
 */

const DEFAULT_MAX_THREADS = 100;

export {
  slugifyTopic,
  exportSingleThreadToTXT,
  exportSingleThreadToJSON,
  exportToJSON,
  exportToTXT,
  parseImportFile,
  downloadFile,
} from "./localStorage";

function getMaxThreads(): number {
  const parsed = parseInt(
    process.env.NEXT_PUBLIC_MAX_THREADS_STORAGE || String(DEFAULT_MAX_THREADS),
    10,
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_THREADS;
}

// ---- Row mapping -----------------------------------------------------------

interface SavedThreadRow {
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
}

function rowToThread(row: SavedThreadRow): SavedThread {
  const tweets = (Array.isArray(row.tweets) ? row.tweets : []) as unknown as Tweet[];
  const settings = (row.settings ?? {}) as unknown as SavedThread["metadata"]["settings"];
  const tags = Array.isArray(row.tags) ? (row.tags as unknown as string[]) : [];

  return {
    metadata: {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      topic: row.topic,
      format: row.format === "single" ? "single" : "thread",
      style: row.style as SavedThread["metadata"]["style"],
      tone: row.tone as SavedThread["metadata"]["tone"],
      language: row.language as SavedThread["metadata"]["language"],
      targetAudience: row.target_audience,
      contentGoal: row.content_goal as SavedThread["metadata"]["contentGoal"],
      settings,
      affiliate: (row.affiliate ?? undefined) as SavedThread["metadata"]["affiliate"],
    },
    tweets,
    totalTweets: row.total_tweets,
    totalChars: row.total_chars,
    version: 1,
    isFavorite: row.is_favorite,
    tags,
    notes: row.notes,
  };
}

function threadToRow(thread: SavedThread, userId: string) {
  return {
    user_id: userId,
    topic: thread.metadata.topic ?? "",
    format: thread.metadata.format ?? "thread",
    style: thread.metadata.style ?? "casual",
    tone: thread.metadata.tone ?? "friendly",
    language: thread.metadata.language ?? "id",
    target_audience: thread.metadata.targetAudience ?? "",
    content_goal: thread.metadata.contentGoal ?? "engagement",
    tweets: (thread.tweets ?? []) as unknown as Json,
    settings: (thread.metadata.settings ?? {}) as unknown as Json,
    affiliate: (thread.metadata.affiliate ?? null) as unknown as Json,
    total_tweets: thread.totalTweets ?? thread.tweets?.length ?? 0,
    total_chars: thread.totalChars ?? 0,
    is_favorite: thread.isFavorite ?? false,
    tags: (thread.tags ?? []) as unknown as Json,
    notes: thread.notes ?? "",
  };
}

async function requireUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ---- Public API ------------------------------------------------------------

export async function listThreads(): Promise<SavedThread[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("saved_threads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as SavedThreadRow[]).map(rowToThread);
}

export async function saveThread(thread: SavedThread): Promise<SavedThread | null> {
  const userId = await requireUserId();
  if (!userId) throw new Error("Not authenticated");

  const supabase = createClient();

  // Enforce the per-user cap by trimming the oldest rows beyond the limit.
  const maxThreads = getMaxThreads();
  const { count } = await supabase
    .from("saved_threads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= maxThreads) {
    const overflow = (count ?? 0) - maxThreads + 1;
    const { data: oldest } = await supabase
      .from("saved_threads")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(overflow);
    if (oldest && oldest.length > 0) {
      await supabase
        .from("saved_threads")
        .delete()
        .in("id", oldest.map((row) => row.id));
    }
  }

  const { data, error } = await supabase
    .from("saved_threads")
    .insert(threadToRow(thread, userId))
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToThread(data as SavedThreadRow);
}

export async function updateThread(
  threadId: string,
  updates: Partial<SavedThread>,
): Promise<boolean> {
  const userId = await requireUserId();
  if (!userId) throw new Error("Not authenticated");

  const supabase = createClient();

  const patch: SavedThreadUpdate = {};
  if (updates.metadata) {
    const m = updates.metadata;
    if (m.topic !== undefined) patch.topic = m.topic;
    if (m.format !== undefined) patch.format = m.format;
    if (m.style !== undefined) patch.style = m.style;
    if (m.tone !== undefined) patch.tone = m.tone;
    if (m.language !== undefined) patch.language = m.language;
    if (m.targetAudience !== undefined) patch.target_audience = m.targetAudience;
    if (m.contentGoal !== undefined) patch.content_goal = m.contentGoal;
    if (m.settings !== undefined) patch.settings = m.settings as unknown as Json;
    if (m.affiliate !== undefined) patch.affiliate = (m.affiliate ?? null) as unknown as Json;
  }
  if (updates.tweets !== undefined) patch.tweets = updates.tweets as unknown as Json;
  if (updates.totalTweets !== undefined) patch.total_tweets = updates.totalTweets;
  if (updates.totalChars !== undefined) patch.total_chars = updates.totalChars;
  if (updates.isFavorite !== undefined) patch.is_favorite = updates.isFavorite;
  if (updates.tags !== undefined) patch.tags = updates.tags as unknown as Json;
  if (updates.notes !== undefined) patch.notes = updates.notes;  const { error } = await supabase
    .from("saved_threads")
    .update(patch)
    .eq("id", threadId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return true;
}

export async function deleteThread(threadId: string): Promise<boolean> {
  const userId = await requireUserId();
  if (!userId) throw new Error("Not authenticated");

  const supabase = createClient();
  const { error } = await supabase
    .from("saved_threads")
    .delete()
    .eq("id", threadId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return true;
}

export async function importThreads(
  newThreads: SavedThread[],
): Promise<{ importedCount: number; skippedCount: number }> {
  const userId = await requireUserId();
  if (!userId) throw new Error("Not authenticated");

  const supabase = createClient();
  const rows = newThreads.map((thread) => threadToRow(thread, userId));

  const { data, error } = await supabase
    .from("saved_threads")
    .insert(rows)
    .select("id");

  if (error) throw new Error(error.message);
  return { importedCount: data?.length ?? 0, skippedCount: 0 };
}
