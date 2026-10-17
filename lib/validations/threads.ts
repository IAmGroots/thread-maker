import { z } from "zod";
import { MAX_CHAIN_LENGTH, MAX_POST_CHARS } from "@/lib/threads/publish";

/**
 * Validation for the Threads publish endpoint. Mirrors the Threads limits so a
 * request that would fail mid-chain is rejected before any post is created.
 */
export const publishRequestSchema = z.object({
  accountId: z.string().uuid(),
  savedThreadId: z.string().uuid().optional(),
  tweets: z
    .array(z.string().trim().min(1).max(MAX_POST_CHARS))
    .min(1, "At least one post is required")
    .max(
      MAX_CHAIN_LENGTH,
      `A thread cannot exceed ${MAX_CHAIN_LENGTH} posts`,
    ),
});

const tweetListSchema = z
  .array(z.string().trim().min(1).max(MAX_POST_CHARS))
  .min(1, "At least one post is required")
  .max(MAX_CHAIN_LENGTH, `A thread cannot exceed ${MAX_CHAIN_LENGTH} posts`);

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
});

export const scheduleDeleteSchema = z.object({
  id: z.string().uuid(),
});

/** Retry a failed scheduled post: re-queue it to run on the next cron pass. */
export const scheduleRetrySchema = z.object({
  id: z.string().uuid(),
});
