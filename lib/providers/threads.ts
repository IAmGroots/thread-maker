import "server-only";

import { MAX_CHAIN_LENGTH, MAX_POST_CHARS } from "@/lib/threads/limits";
import { publishThreadChain } from "@/lib/threads/publish";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchThreadsProfile,
} from "@/lib/threads/oauth";
import { refreshLongLivedToken } from "@/lib/threads/client";
import { fetchThreadsInsights } from "@/lib/analytics/threads-insights";
import type {
  AnalyticsInput,
  AuthUrlInput,
  ExchangeInput,
  PostInput,
  ProviderCapabilities,
  ProviderProfile,
  PublishInput,
  PublishResult,
  RawMetrics,
  RefreshInput,
  SocialProvider,
  TokenSet,
  ValidationIssue,
  ValidationResult,
} from "@/lib/providers/types";

const capabilities: ProviderCapabilities = {
  text: true,
  image: true,
  video: false,
  carousel: false,
  thread: true,
  analytics: true,
  delete: false,
  requiresMedia: false,
};

export function validateThreadsPost(input: PostInput): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (input.segments.length === 0) {
    issues.push({ code: "empty", message: "A thread needs at least one post." });
  }

  if (input.segments.length > MAX_CHAIN_LENGTH) {
    issues.push({
      code: "too_many_segments",
      message: `Threads allows at most ${MAX_CHAIN_LENGTH} posts per thread.`,
    });
  }

  input.segments.forEach((text, index) => {
    if (text.trim().length === 0) {
      issues.push({
        segmentIndex: index,
        code: "empty_segment",
        message: `Post ${index + 1} is empty.`,
      });
    }
    if (text.length > MAX_POST_CHARS) {
      issues.push({
        segmentIndex: index,
        code: "too_long",
        message: `Post ${index + 1} exceeds ${MAX_POST_CHARS} characters.`,
      });
    }
  });

  return { valid: issues.length === 0, issues };
}

export const threadsProvider: SocialProvider = {
  id: "threads",
  capabilities,

  getAuthUrl(input: AuthUrlInput): string {
    return buildAuthorizeUrl(input.state);
  },

  async exchangeCode(input: ExchangeInput): Promise<TokenSet> {
    const shortLived = await exchangeCodeForToken(input.code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    return {
      accessToken: longLived.access_token,
      expiresAt: new Date(Date.now() + longLived.expires_in * 1000),
    };
  },

  async refreshToken(input: RefreshInput): Promise<TokenSet> {
    const refreshed = await refreshLongLivedToken(input.refreshToken);
    return {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt ? new Date(refreshed.expiresAt) : undefined,
    };
  },

  async getProfile(accessToken: string): Promise<ProviderProfile> {
    const profile = await fetchThreadsProfile(accessToken);
    return {
      providerAccountId: profile.id,
      username: profile.username,
      displayName: profile.username,
    };
  },

  validatePost: validateThreadsPost,

  async publish(input: PublishInput): Promise<PublishResult> {
    const startIndex = input.checkpoint ?? 0;
    const state: Record<string, unknown> = { ...(input.providerState ?? {}) };
    let primaryPostId =
      typeof state.primaryPostId === "string" ? state.primaryPostId : undefined;

    const result = await publishThreadChain(input.accessToken, input.post.segments, {
      startIndex,
      replyToId:
        typeof state.lastPostId === "string" ? state.lastPostId : undefined,
      imageUrl: startIndex === 0 ? input.post.media?.[0]?.url : undefined,
      onProgress: async (index, postId) => {
        primaryPostId = primaryPostId ?? postId;
        state.lastPostId = postId;
        state.primaryPostId = primaryPostId;
        await input.onCheckpoint?.(index + 1, { ...state });
      },
    });

    return {
      status:
        result.status === "published"
          ? "published"
          : result.status === "partial_published"
            ? "partial"
            : "failed",
      providerPostId: primaryPostId ?? result.postIds[0],
      publishedCount: startIndex + result.publishedCount,
      total: input.post.segments.length,
      // `publishThreadChain` reports the absolute index because it starts its
      // loop at `startIndex`; adding the offset again would double-count it.
      failedAtIndex: result.failedAtIndex,
      errorMessage: result.error,
      providerState: state,
    };
  },

  async getAnalytics(input: AnalyticsInput): Promise<RawMetrics[]> {
    const metrics = await fetchThreadsInsights(
      input.accessToken,
      input.providerPostId,
    );

    if (!metrics) return [];

    return [
      {
        capturedAt: new Date(),
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        raw: metrics.raw,
      },
    ];
  },
};
