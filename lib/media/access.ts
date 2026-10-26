import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * Media ids arrive from the browser, so the workspace check must happen on the
 * server before the worker signs and publishes the asset.
 */
export async function mediaBelongsToWorkspace(
  client: Client,
  workspaceId: string,
  mediaId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("media_assets")
    .select("id")
    .eq("id", mediaId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}
