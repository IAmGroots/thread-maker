"use client";

import { useCallback, useEffect, useState } from "react";

export interface ThreadsAccountSummary {
  id: string;
  username: string;
  token_expires_at: string | null;
  connected_at: string;
}

interface UseThreadsAccountsResult {
  accounts: ThreadsAccountSummary[];
  publishedThreadIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  refresh: (accountId?: string) => Promise<void>;
}

/**
 * Loads the user's connected Threads accounts and, for a selected account, the
 * saved-thread ids already published to it (for the per-account badge).
 */
export function useThreadsAccounts(accountId?: string): UseThreadsAccountsResult {
  const [accounts, setAccounts] = useState<ThreadsAccountSummary[]>([]);
  const [publishedThreadIds, setPublishedThreadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (forAccountId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = forAccountId
        ? `/api/threads/accounts?accountId=${encodeURIComponent(forAccountId)}`
        : "/api/threads/accounts";
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load accounts");
      }
      setAccounts(data.accounts ?? []);
      setPublishedThreadIds(new Set<string>(data.publishedThreadIds ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(accountId);
  }, [refresh, accountId]);

  return { accounts, publishedThreadIds, isLoading, error, refresh };
}
