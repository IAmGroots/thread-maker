import "server-only";

import { threadsProvider } from "@/lib/providers/threads";
import { withMockPublish } from "@/lib/providers/mock-threads";
import type { ProviderId, SocialProvider } from "@/lib/providers/types";

/**
 * `PROVIDER_MOCK=1` swaps Threads publishing for a local simulation so the
 * pipeline can be exercised without a real account. It is opt-in and logs a
 * warning on startup.
 */
const threads =
  process.env.PROVIDER_MOCK === "1"
    ? withMockPublish(threadsProvider)
    : threadsProvider;

const registry = new Map<ProviderId, SocialProvider>([[threads.id, threads]]);

export function getProvider(id: ProviderId): SocialProvider {
  const provider = registry.get(id);
  if (!provider) {
    throw new Error(`Provider "${id}" is not registered.`);
  }
  return provider;
}

export function listProviders(): SocialProvider[] {
  return Array.from(registry.values());
}

export function registerProvider(provider: SocialProvider): void {
  registry.set(provider.id, provider);
}
