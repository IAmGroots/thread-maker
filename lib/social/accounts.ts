import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "@/lib/threads/crypto";
import { getProvider } from "@/lib/providers/registry";
import type { ProviderId } from "@/lib/providers/types";

const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export interface AccountSummary {
  id: string;
  provider: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  token_expires_at: string | null;
  connected_at: string;
  status: string;
}

export interface PublishAccount {
  id: string;
  workspaceId: string;
  provider: ProviderId;
  username: string;
  accessToken: string;
  tokenExpiresAt: string | null;
}

export async function listAccounts(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<AccountSummary[]> {
  const { data, error } = await supabase
    .from("social_accounts")
    .select(
      "id, provider, username, display_name, avatar_url, token_expires_at, created_at, status",
    )
    .eq("workspace_id", workspaceId)
    // Expired accounts stay visible so Settings can offer a reconnect.
    .in("status", ["active", "expired"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    provider: row.provider,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    token_expires_at: row.token_expires_at,
    connected_at: row.created_at,
    status: row.status,
  }));
}

/**
 * Load an account and return a usable access token. Refreshes in place when the
 * token expires within a week and persists the new value encrypted.
 */
export async function getPublishAccount(
  supabase: SupabaseClient,
  workspaceId: string,
  accountId: string,
): Promise<PublishAccount | null> {
  const { data: account, error } = await supabase
    .from("social_accounts")
    .select(
      "id, workspace_id, provider, username, access_token_enc, refresh_token_enc, token_expires_at, status",
    )
    .eq("id", accountId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!account || account.status !== "active" || !account.access_token_enc) {
    return null;
  }

  const provider = getProvider(account.provider as ProviderId);
  let accessToken = await decryptToken(account.access_token_enc);
  let expiresAt = account.token_expires_at;

  const expiresSoon =
    expiresAt != null &&
    new Date(expiresAt).getTime() - Date.now() < REFRESH_THRESHOLD_MS;

  if (expiresSoon) {
    try {
      const refreshed = await provider.refreshToken({
        refreshToken: account.refresh_token_enc
          ? await decryptToken(account.refresh_token_enc)
          : accessToken,
      });

      accessToken = refreshed.accessToken;
      expiresAt = refreshed.expiresAt?.toISOString() ?? expiresAt;

      await supabase
        .from("social_accounts")
        .update({
          access_token_enc: await encryptToken(accessToken),
          refresh_token_enc: refreshed.refreshToken
            ? await encryptToken(refreshed.refreshToken)
            : account.refresh_token_enc,
          token_expires_at: expiresAt,
        })
        .eq("id", account.id);
    } catch {
      // Keep the current token: it may still work, and the publish attempt
      // reports the real error instead of failing early on a refresh.
    }
  }

  return {
    id: account.id,
    workspaceId: account.workspace_id,
    provider: account.provider as ProviderId,
    username: account.username,
    accessToken,
    tokenExpiresAt: expiresAt,
  };
}
