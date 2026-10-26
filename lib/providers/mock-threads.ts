import "server-only";

import type { SocialProvider } from "@/lib/providers/types";

/**
 * Local stand-in for the Threads API.
 *
 * Enable with `PROVIDER_MOCK=1` to exercise the publish pipeline without a
 * real account: the chain succeeds, reports checkpoints, and marks a segment
 * containing "FAIL" as a failure so the partial path can be tested too.
 *
 * Never enabled in production unless the flag is set explicitly.
 */
export function withMockPublish(base: SocialProvider): SocialProvider {
  console.warn(
    "[providers] PROVIDER_MOCK=1: Threads publishing is simulated, nothing is sent to Meta.",
  );

  return {
    ...base,
    async publish(input) {
      const startIndex = input.checkpoint ?? 0;
      const state: Record<string, unknown> = { ...(input.providerState ?? {}) };
      let primaryPostId =
        typeof state.primaryPostId === "string" ? state.primaryPostId : undefined;

      let published = 0;

      for (let index = startIndex; index < input.post.segments.length; index += 1) {
        // A short pause keeps the client-side progress visible in dev.
        await new Promise((resolve) => setTimeout(resolve, 300));

        const text = input.post.segments[index];
        if (text.includes("FAIL")) {
          return {
            status: "partial",
            providerPostId: primaryPostId,
            publishedCount: startIndex + published,
            total: input.post.segments.length,
            failedAtIndex: index,
            errorMessage: "Simulated failure (PROVIDER_MOCK)",
            providerState: state,
          };
        }

        const postId = `mock-${index + 1}-${Math.random().toString(36).slice(2, 8)}`;
        primaryPostId = primaryPostId ?? postId;
        state.lastPostId = postId;
        state.primaryPostId = primaryPostId;
        published += 1;

        await input.onCheckpoint?.(index + 1, { ...state });
      }

      return {
        status: "published",
        providerPostId: primaryPostId,
        publishedCount: input.post.segments.length,
        total: input.post.segments.length,
        failedAtIndex: null,
        providerState: state,
      };
    },
  };
}
