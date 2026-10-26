import { z } from "zod";
import { MAX_CHAIN_LENGTH, MAX_POST_CHARS } from "@/lib/threads/limits";

const tweetListSchema = z
  .array(z.string().trim().min(1).max(MAX_POST_CHARS))
  .min(1, "At least one post is required")
  .max(MAX_CHAIN_LENGTH, `A thread cannot exceed ${MAX_CHAIN_LENGTH} posts`);

/**
 * Validation for the Threads publish endpoint. Mirrors the Threads limits so a
 * request that would fail mid-chain is rejected before any post is created.
 */
export const publishRequestSchema = z.object({
  accountId: z.string().uuid(),
  savedThreadId: z.string().uuid().optional(),
  tweets: tweetListSchema,
  mediaId: z.string().uuid().optional(),
  /**
   * Generated when the publish dialog opens. Retrying the same dialog reuses it
   * so the server dedupes instead of creating a second target.
   */
  requestId: z.string().uuid().optional(),
});

/** Create a scheduled post. `scheduledFor` is an ISO datetime in the future. */
export const scheduleRequestSchema = z.object({
  accountId: z.string().uuid(),
  savedThreadId: z.string().uuid().optional(),
  tweets: tweetListSchema,
  scheduledFor: z
    .string()
    .datetime({ message: "scheduledFor must be an ISO datetime" })
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: "Scheduled time must be in the future",
    }),
  mediaId: z.string().uuid().optional(),
});

export const scheduleDeleteSchema = z.object({
  id: z.string().uuid(),
});

/** Retry a failed scheduled post: re-queue it to run on the next cron pass. */
export const scheduleRetrySchema = z.object({
  id: z.string().uuid(),
});

/** Reschedule an existing target. The time must still be in the future. */
export const rescheduleRequestSchema = z.object({
  scheduledFor: z
    .string()
    .datetime({ message: "scheduledFor must be an ISO datetime" })
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: "Scheduled time must be in the future",
    }),
});
