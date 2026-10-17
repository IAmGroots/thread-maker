import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken, encryptToken } from "@/lib/threads/crypto";
import { ensureFreshToken } from "@/lib/threads/client";
import { publishThreadChain, MAX_CHAIN_LENGTH, MAX_POST_CHARS } from "@/lib/threads/publish";
import { publishRequestSchema } from "@/lib/validations/threads";
import { apiErrorResponse } from "@/lib/security/apiError";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const raw = await request.json();
    const parsed = publishRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }
    const { accountId, savedThreadId, tweets } = parsed.data;

    // Load the account (RLS scopes to the current user).
    const { data: account, error: accountError } = await supabase
      .from("threads_accounts")
      .select("id, username, access_token, token_expires_at, is_active")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError) throw new Error(accountError.message);
    if (!account || !account.is_active) {
      return NextResponse.json(
        { success: false, error: "Threads account not found or inactive" },
        { status: 404 },
      );
    }

    // Decrypt and refresh the token when it is close to expiring.
    let accessToken = await decryptToken(account.access_token);
    const fresh = await ensureFreshToken(accessToken, account.token_expires_at);
    if (fresh.accessToken !== accessToken) {
      accessToken = fresh.accessToken;
      const encrypted = await encryptToken(accessToken);
      await supabase
        .from("threads_accounts")
        .update({
          access_token: encrypted,
          token_expires_at: fresh.expiresAt || account.token_expires_at,
        })
        .eq("id", account.id)
        .eq("user_id", user.id);
    }

    const result = await publishThreadChain(accessToken, tweets);

    const primaryPostId = result.postIds[0] ?? null;

    await supabase.from("thread_publishes").insert({
      user_id: user.id,
      saved_thread_id: savedThreadId ?? null,
      threads_account_id: account.id,
      status: result.status,
      threads_post_id: primaryPostId,
      reply_chain: result.postIds,
      error_message: result.error ?? null,
    });

    return NextResponse.json({
      success: result.status === "published",
      status: result.status,
      publishedCount: result.publishedCount,
      total: result.total,
      failedAtIndex: result.failedAtIndex,
      primaryPostId,
      username: account.username,
      error: result.error,
      limits: { maxTweets: MAX_CHAIN_LENGTH, maxChars: MAX_POST_CHARS },
    });
  } catch (error) {
    return apiErrorResponse(error, "threads-publish", 500);
  }
}
