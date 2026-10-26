"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export interface ThreadsAccountSummary {
  id: string;
  username: string;
  token_expires_at: string | null;
  connected_at: string;
  status?: string;
}

interface UseThreadsAccountsResult {
  accounts: ThreadsAccountSummary[];
  publishedThreadIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  refresh: (accountId?: string) => Promise<void>;
}

interface AccountsEntry {
  accountId?: string;
  accounts: ThreadsAccountSummary[];
  publishedThreadIds: string[];
  isLoading: boolean;
  error: string | null;
  fetchedAt: number;
}

const CACHE_TTL_MS = 30_000;

const cache = new Map<string, AccountsEntry>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();

const EMPTY_ENTRY: AccountsEntry = {
  accounts: [],
  publishedThreadIds: [],
  isLoading: true,
  error: null,
  fetchedAt: 0,
};

function keyOf(accountId?: string): string {
  return accountId ?? "__all__";
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function writeEntry(key: string, entry: AccountsEntry) {
  cache.set(key, entry);
  notify(key);
}

async function fetchKey(accountId?: string): Promise<void> {
  const key = keyOf(accountId);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const previous = cache.get(key);
  writeEntry(key, {
    accountId,
    accounts: previous?.accounts ?? [],
    publishedThreadIds: previous?.publishedThreadIds ?? [],
    isLoading: true,
    error: null,
    fetchedAt: previous?.fetchedAt ?? 0,
  });

  const task = (async () => {
    try {
      const url = accountId
        ? `/api/threads/accounts?accountId=${encodeURIComponent(accountId)}`
        : "/api/threads/accounts";
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load accounts");
      }
      writeEntry(key, {
        accountId,
        accounts: data.accounts ?? [],
        publishedThreadIds: data.publishedThreadIds ?? [],
        isLoading: false,
        error: null,
        fetchedAt: Date.now(),
      });
    } catch (err) {
      writeEntry(key, {
        accountId,
        accounts: previous?.accounts ?? [],
        publishedThreadIds: previous?.publishedThreadIds ?? [],
        isLoading: false,
        error: err instanceof Error ? err.message : "unknown",
        fetchedAt: previous?.fetchedAt ?? 0,
      });
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, task);
  return task;
}

function ensureLoaded(accountId?: string) {
  const entry = cache.get(keyOf(accountId));
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) return;
  void fetchKey(accountId);
}

/** Drop every cached account list, so a different user never sees stale data. */
export function clearThreadsAccountsCache() {
  cache.clear();
  inFlight.clear();
  listeners.forEach((set) => set.forEach((listener) => listener()));
}

/**
 * Loads the user's connected Threads accounts and, for a selected account, the
 * saved-thread ids already published to it (for the per-account badge).
 *
 * Every component that calls this shares one cache entry per account id, so a
 * list of twenty threads still triggers a single request.
 */
export function useThreadsAccounts(accountId?: string): UseThreadsAccountsResult {
  const key = keyOf(accountId);

  const subscribe = useCallback(
    (onChange: () => void) => {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(onChange);
      return () => {
        set!.delete(onChange);
        if (set!.size === 0) listeners.delete(key);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => cache.get(key) ?? EMPTY_ENTRY, [key]);

  const entry = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_ENTRY);

  useEffect(() => {
    ensureLoaded(accountId);
  }, [accountId]);

  const refresh = useCallback(
    async (forAccountId?: string) => {
      const targets = new Map<string, string | undefined>();
      cache.forEach((value, cacheKey) => {
        targets.set(cacheKey, value.accountId);
      });
      targets.set(keyOf(forAccountId), forAccountId);

      await Promise.all(
        Array.from(targets.values()).map((id) => fetchKey(id)),
      );
    },
    [],
  );

  return {
    accounts: entry.accounts,
    publishedThreadIds: new Set(entry.publishedThreadIds),
    isLoading: entry.isLoading,
    error: entry.error,
    refresh,
  };
}
