import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ResolveContentInput {
  workspaceId: string;
  userId: string;
  savedThreadId?: string;
  segments: string[];
}

/**
 * Return the content item behind a saved thread, or create one from raw
 * segments. The library still lives in saved_threads, which mirrors into
 * content_items through a database trigger, so a saved thread almost always
 * already has a content item.
 *
 * Writes use the service role: browser writes to content_items are disabled so
 * a client cannot create cross-workspace rows or skip validation.
 */
export async function resolveContentItem(
  input: ResolveContentInput,
): Promise<string> {
  const supabase = createAdminClient();

  if (input.savedThreadId) {
    const { data: existing, error } = await supabase
      .from("content_items")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("legacy_saved_thread_id", input.savedThreadId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (existing) return existing.id;
  }

  const title = input.segments[0]?.slice(0, 80) ?? "";

  const { data: created, error: createError } = await supabase
    .from("content_items")
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.userId,
      title,
      base_text: input.segments.join("\n\n"),
      status: "draft",
    })
    .select("id")
    .single();

  if (createError) throw new Error(createError.message);

  const rows = input.segments.map((text, position) => ({
    content_item_id: created.id,
    position,
    text,
  }));

  const { error: segmentError } = await supabase
    .from("content_segments")
    .insert(rows);

  if (segmentError) throw new Error(segmentError.message);

  return created.id;
}
