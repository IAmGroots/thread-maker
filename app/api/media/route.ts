import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import {
  ALLOWED_IMAGE_TYPES,
  MEDIA_BUCKET,
  MAX_IMAGE_BYTES,
  buildStoragePath,
  isAllowedImageType,
  listMediaAssets,
  mediaUsageBytes,
} from "@/lib/media/storage";
import { getPlanLimits } from "@/lib/billing/credits";
import { apiErrorResponse } from "@/lib/security/apiError";

const updateSchema = z.object({
  id: z.string().uuid(),
  altText: z.string().max(300).optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  try {
    const supabase = await createClient();
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const assets = await listMediaAssets(supabase, workspace.id);
    const usedBytes = await mediaUsageBytes(supabase, workspace.id);
    const limitBytes = getPlanLimits(workspace.plan).mediaBytes;

    return NextResponse.json({
      success: true,
      assets,
      usage: { usedBytes, limitBytes },
    });
  } catch (error) {
    return apiErrorResponse(error, "media-list", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const workspace = await getCurrentWorkspace();

    if (!user || !workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const altText = String(form.get("altText") ?? "").trim().slice(0, 300);

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    if (!isAllowedImageType(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
        },
        { status: 415 },
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: "File is larger than 8 MB" },
        { status: 413 },
      );
    }

    const admin = createAdminClient();
    const mimeType = file.type;
    const usedBytes = await mediaUsageBytes(admin, workspace.id);
    const limitBytes = getPlanLimits(workspace.plan).mediaBytes;

    if (usedBytes + file.size > limitBytes) {
      return NextResponse.json(
        { success: false, error: "Storage limit reached for this plan" },
        { status: 402 },
      );
    }

    const bytes = await file.arrayBuffer();
    const assetId = crypto.randomUUID();
    const storagePath = buildStoragePath(workspace.id, mimeType, assetId);

    const { error: uploadError } = await admin.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: asset, error: insertError } = await admin
      .from("media_assets")
      .insert({
        id: assetId,
        workspace_id: workspace.id,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: file.size,
        alt_text: altText || null,
        checksum: await sha256Hex(bytes),
        created_by: user.id,
      })
      .select(
        "id, storage_path, mime_type, width, height, size_bytes, alt_text, created_at",
      )
      .single();

    if (insertError) {
      await admin.storage.from(MEDIA_BUCKET).remove([storagePath]);
      throw new Error(insertError.message);
    }

    const { data: signed } = await admin.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      asset: { ...asset, url: signed?.signedUrl ?? null },
    });
  } catch (error) {
    return apiErrorResponse(error, "media-upload", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("media_assets")
      .update({
        alt_text: (parsed.data.altText ?? "").trim().slice(0, 300) || null,
      })
      .eq("id", parsed.data.id)
      .eq("workspace_id", workspace.id)
      .select("id");

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "Media not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "media-update", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const parsed = deleteSchema.safeParse({
      id: new URL(request.url).searchParams.get("id"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: asset, error: readError } = await admin
      .from("media_assets")
      .select("id, storage_path")
      .eq("id", parsed.data.id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!asset) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await admin.storage.from(MEDIA_BUCKET).remove([asset.storage_path]);

    const { data, error } = await admin
      .from("media_assets")
      .delete()
      .eq("id", asset.id)
      .eq("workspace_id", workspace.id)
      .select("id");

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "media-delete", 500);
  }
}
