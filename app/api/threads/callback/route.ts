import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  THREADS_STATE_COOKIE,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchThreadsProfile,
  computeTokenExpiry,
} from "@/lib/threads/oauth";
import { encryptToken } from "@/lib/threads/crypto";
import { getRequestOrigin } from "@/lib/http/origin";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { getPlanLimits } from "@/lib/billing/credits";
import { apiErrorResponse } from "@/lib/security/apiError";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const cookieState = request.cookies.get(THREADS_STATE_COOKIE)?.value;

  const failRedirect = (reason: string) =>
    NextResponse.redirect(`${origin}/settings?threads_error=${reason}`);

  if (errorParam) {
    return failRedirect("denied");
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    return failRedirect("invalid_state");
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${origin}/login`);
    }

    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const profile = await fetchThreadsProfile(longLived.access_token);

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.redirect(`${origin}/login`);
    }

    // Enforce the channel limit, but let an existing account reconnect even
    // when the workspace is already at its limit.
    const { data: existing, error: existingError } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("provider", "threads")
      .eq("provider_account_id", profile.id)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    if (!existing) {
      const { count, error: countError } = await supabase
        .from("social_accounts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("status", "active");

      if (countError) throw new Error(countError.message);

      const limit = getPlanLimits(workspace.plan).channels;
      if ((count ?? 0) >= limit) {
        return failRedirect("channel_limit");
      }
    }

    const encryptedToken = await encryptToken(longLived.access_token);
    const expiresAt = computeTokenExpiry(longLived.expires_in);

    const { error: upsertError } = await supabase
      .from("threads_accounts")
      .upsert(
        {
          user_id: user.id,
          threads_user_id: profile.id,
          username: profile.username,
          access_token: encryptedToken,
          token_expires_at: expiresAt,
          is_active: true,
        },
        { onConflict: "user_id,threads_user_id" },
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const response = NextResponse.redirect(`${origin}/settings?threads_connected=1`);
    response.cookies.delete(THREADS_STATE_COOKIE);
    return response;
  } catch (error) {
    return apiErrorResponse(error, "threads-callback", 500);
  }
}
