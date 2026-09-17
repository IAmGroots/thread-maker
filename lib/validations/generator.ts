import { z } from "zod";

export const writingStyleEnum = z.enum([
  "professional",
  "casual",
  "storytelling",
  "educational",
  "humorous",
  "controversial",
  "persuasive",
  "inspirational",
  "news",
]);

export const toneEnum = z.enum([
  "friendly",
  "confident",
  "witty",
  "authoritative",
  "emotional",
  "casual",
  "formal",
  "sarcastic",
]);

export const contentGoalEnum = z.enum([
  "engagement",
  "personal-branding",
  "education",
  "promotion",
  "follower-growth",
]);

export const languageEnum = z.enum(["id", "en"]);
export const tweetLengthEnum = z.enum(["short", "medium", "long"]);
export const formatEnum = z.enum(["single", "thread"]);

export const generateConfigSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, "Topic is required")
    .max(1000, "Topic cannot exceed 1000 characters"),
  format: formatEnum.default("thread"),
  numberOfTweets: z.number().int().min(1).max(25).default(5),
  numberOfVersions: z.number().int().min(1).max(5).default(1),
  style: writingStyleEnum.default("casual"),
  tone: toneEnum.default("friendly"),
  language: languageEnum.default("id"),
  targetAudience: z.string().trim().max(200).default("General"),
  contentGoal: contentGoalEnum.default("engagement"),
  tweetLength: tweetLengthEnum.default("medium"),
  useHook: z.boolean().default(true),
  useCTA: z.boolean().default(false),
  includeEmojis: z.boolean().default(false),
  includeHashtags: z.boolean().default(false),
  customHashtags: z
    .array(z.string().trim().max(50))
    .max(10)
    .optional()
    .default([]),
});

export const generateRequestSchema = z.object({
  config: generateConfigSchema,
});

export const adjustLengthRequestSchema = z.object({
  threadId: z.string().optional(),
  tweetIndex: z.number().int().min(0).optional(),
  direction: z.enum(["shorten", "lengthen"]),
  tweetContent: z
    .string()
    .trim()
    .min(1, "Tweet content is required")
    .max(1500, "Tweet content is too long (max 1500 characters)"),
});

export const transformRequestSchema = z.object({
  threadId: z.string().optional(),
  tweets: z
    .array(z.string().trim().min(1).max(1000))
    .min(1, "At least one tweet is required")
    .max(25, "Cannot transform more than 25 tweets at once"),
  newStyle: writingStyleEnum,
  newTone: toneEnum,
});

export const regenerateTweetRequestSchema = z.object({
  threadId: z.string().optional(),
  tweetIndex: z.number().int().min(0).max(25),
  context: z
    .array(z.string().trim().max(1000))
    .max(25, "Context cannot exceed 25 tweets"),
});
