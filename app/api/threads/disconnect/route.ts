import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/security/apiError";

const disconnectSchema = z.object({
  accountId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = disconnectSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data: account, error: readError } = await admin
      .from("social_accounts")
      .select("id, provider, provider_account_id")
      .eq("id", parsed.data.accountId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 },
      );
    }

    // Keep publish history but drop the credentials: the privacy policy says a
    // disconnected account no longer has a stored token.
    const { error: revokeError } = await admin
      .from("social_accounts")
      .update({
        status: "revoked",
        access_token_enc: null,
        refresh_token_enc: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id)
      .eq("workspace_id", workspace.id);

    if (revokeError) throw new Error(revokeError.message);

    // Targets that have not gone out yet cannot be published without a token.
    const { error: cancelError } = await admin
      .from("post_targets")
      .update({ status: "canceled" })
      .eq("workspace_id", workspace.id)
      .eq("social_account_id", account.id)
      .in("status", ["scheduled", "failed", "partial", "draft"]);

    if (cancelError) throw new Error(cancelError.message);

    // Remove the legacy copy so the connect flow can add it again cleanly.
    if (account.provider === "threads") {
      const { error: legacyError } = await admin
        .from("threads_accounts")
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("threads_user_id", account.provider_account_id);

      if (legacyError) throw new Error(legacyError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "threads-disconnect", 500);
  }
}
