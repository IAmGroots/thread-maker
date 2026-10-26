import "server-only";

import type { ProviderId, PublishResult } from "@/lib/providers/types";

export type TargetStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "partial"
  | "failed"
  | "canceled";

export interface ClaimedTarget {
  id: string;
  workspaceId: string;
  contentItemId: string;
  socialAccountId: string;
  provider: ProviderId;
  scheduledFor: Date;
  attempts: number;
  checkpoint: number;
  providerState: Record<string, unknown>;
  contentOverride: {
    segments?: string[];
    media?: Array<{ url: string; mimeType: string; altText?: string }>;
  };
}

export interface FailOptions {
  code: string;
  message: string;
  retryAt?: Date;
  checkpoint?: number;
  providerState?: Record<string, unknown>;
}

/**
 * The publish pipeline talks to this interface only. The MVP implementation
 * claims rows from Postgres; a Cloudflare Queues implementation can replace it
 * without touching the worker.
 */
export interface QueueAdapter {
  claimDue(limit: number): Promise<ClaimedTarget[]>;
  /** Claim one specific target, used by "publish now". */
  claimOne(id: string): Promise<ClaimedTarget | null>;
  /** Persist progress after each published segment so a retry resumes there. */
  saveCheckpoint(
    id: string,
    checkpoint: number,
    providerState: Record<string, unknown>,
  ): Promise<void>;
  markPublished(id: string, result: PublishResult): Promise<void>;
  markPartial(id: string, result: PublishResult): Promise<void>;
  markFailed(id: string, options: FailOptions): Promise<void>;
  releaseExpiredLeases(leaseMs: number): Promise<number>;
}
