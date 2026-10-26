import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "@/lib/threads/crypto";
import { getProvider } from "@/lib/providers/registry";
import type { ProviderId } from "@/lib/providers/types";

export interface RefreshSummary {
  checked: number;
  refreshed: number;
  expired: number;
}

/**
 * Refresh tokens that are about to expire and flag the ones the platform no
 * longer accepts, so the UI can ask the user to reconnect before a publish
 * fails. Tokens are only ever decrypted on the server.
 */
export async function refreshExpiringAccounts(
  client: SupabaseClient,
  withinDays = 3,
  limit = 5,
): Promise<RefreshSummary> {
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: accounts, error } = await client
    .from("social_accounts")
    .select("id, provider, access_token_enc, token_expires_at")
    .eq("status", "active")
    .not("token_expires_at", "is", null)
    .lte("token_expires_at", cutoff)
    .order("token_expires_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const summary: RefreshSummary = { checked: 0, refreshed: 0, expired: 0 };

  for (const account of accounts ?? []) {
    if (!account.access_token_enc) continue;
    summary.checked += 1;

    try {
      const provider = getProvider(account.provider as ProviderId);
      const currentToken = await decryptToken(account.access_token_enc);

      const refreshed = await provider.refreshToken({
        refreshToken: currentToken,
      });

      const { error: updateError } = await client
        .from("social_accounts")
        .update({
          access_token_enc: await encryptToken(refreshed.accessToken),
          token_expires_at: refreshed.expiresAt?.toISOString() ?? null,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      if (updateError) throw new Error(updateError.message);
      summary.refreshed += 1;
    } catch {
      // The platform rejected the token: mark it so Settings offers a reconnect.
      const { error: expireError } = await client
        .from("social_accounts")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", account.id);

      if (!expireError) summary.expired += 1;
    }
  }

  return summary;
}
