import {
  WritingStyle,
  Tone,
  ContentGoal,
  Language,
  TweetLength,
  AffiliateConfig,
  AffiliateProduct,
  AffiliateStoryAngle,
  AffiliateCtaPlacement,
} from "./thread";

export type {
  AffiliateConfig,
  AffiliateProduct,
  AffiliateStoryAngle,
  AffiliateCtaPlacement,
};

export interface GeneratorConfig {
  topic: string;
  format: "single" | "thread";
  numberOfTweets: number; // 1-25
  numberOfVersions: number; // 1-5
  style: WritingStyle;
  tone: Tone;
  language: Language;
  targetAudience: string;
  contentGoal: ContentGoal;
  tweetLength: TweetLength;
  useHook: boolean;
  useCTA: boolean;
  includeEmojis: boolean;
  includeHashtags: boolean;
  customHashtags?: string[];
  affiliate?: AffiliateConfig;
}

export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  topic: "",
  format: "thread",
  numberOfTweets: 5,
  numberOfVersions: 1,
  style: "casual",
  tone: "friendly",
  language: "id",
  targetAudience: "General",
  contentGoal: "engagement",
  tweetLength: "medium",
  useHook: true,
  useCTA: false,
  includeEmojis: false,
  includeHashtags: false,
  customHashtags: [],
  affiliate: {
    enabled: false,
  },
};

export interface GeneratorSettings {
  numberOfTweets: number;
  numberOfVersions: number;
  useHook: boolean;
  useCTA: boolean;
  includeEmojis: boolean;
  includeHashtags: boolean;
  customHashtags?: string[];
  tweetLength: TweetLength;
}

export interface GenerateRequest {
  config: GeneratorConfig;
}

export interface GenerateResponse {
  success: boolean;
  threads: Array<{
    tweets: Array<{
      content: string;
      order: number;
    }>;
  }>;
  error?: string;
}

export interface TransformStyleRequest {
  threadId: string;
  newStyle: WritingStyle;
  newTone: Tone;
}

export interface AdjustLengthRequest {
  threadId: string;
  tweetIndex: number;
  direction: "shorten" | "lengthen";
}

export interface RegenerateTweetRequest {
  threadId: string;
  tweetIndex: number;
  context: string[];
}
