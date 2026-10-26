import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_BUCKET = "workspace-media";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/**
 * Threads accepts JPEG and PNG for `image_url`; WebP is rejected by the
 * platform, so it is not accepted at upload time either.
 */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export interface MediaAsset {
  id: string;
  storage_path: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number;
  alt_text: string | null;
  created_at: string;
  url: string | null;
}

const EXTENSIONS: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function isAllowedImageType(value: string): value is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(value);
}

export function buildStoragePath(
  workspaceId: string,
  mimeType: AllowedImageType,
  assetId: string,
): string {
  return `${workspaceId}/${assetId}.${EXTENSIONS[mimeType]}`;
}

export async function signMediaUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function listMediaAssets(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<MediaAsset[]> {
  const { data, error } = await supabase
    .from("media_assets")
    .select(
      "id, storage_path, mime_type, width, height, size_bytes, alt_text, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const assets = data ?? [];
  if (assets.length === 0) return [];

  // One round trip for all previews instead of one per asset.
  const { data: signed } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(
      assets.map((asset) => asset.storage_path),
      3600,
    );

  const urlByPath = new Map(
    (signed ?? []).map((entry) => [entry.path, entry.signedUrl ?? null]),
  );

  return assets.map((asset) => ({
    ...asset,
    url: urlByPath.get(asset.storage_path) ?? null,
  }));
}

/** Total bytes used by a workspace, for plan limits. */
export async function mediaUsageBytes(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("media_usage_bytes", {
    p_workspace: workspaceId,
  });

  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
