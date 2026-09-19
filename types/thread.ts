// Tweet structure
export interface Tweet {
  id: string;
  content: string;
  order: number;
  charCount: number;
  hasEmoji: boolean;
  hashtags: string[];
}

// Tweet length preference
export type TweetLength = "short" | "medium" | "long";

// Generator settings (subset of config)
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

// Thread metadata
export interface ThreadMetadata {
  id: string;
  createdAt: string;
  updatedAt: string;
  topic: string;
  format: "single" | "thread";
  style: WritingStyle;
  tone: Tone;
  language: Language;
  targetAudience: string;
  contentGoal: ContentGoal;
  settings: GeneratorSettings;
  affiliate?: AffiliateConfig;
}

// Generated thread
export interface GeneratedThread {
  metadata: ThreadMetadata;
  tweets: Tweet[];
  totalTweets: number;
  totalChars: number;
  version: number;
}

// Saved thread (with additional fields)
export interface SavedThread extends GeneratedThread {
  isFavorite: boolean;
  tags: string[];
  notes: string;
}

// Writing styles
export type WritingStyle =
  | "professional"
  | "casual"
  | "storytelling"
  | "educational"
  | "humorous"
  | "controversial"
  | "persuasive"
  | "inspirational"
  | "news";

// Tone options
export type Tone =
  | "friendly"
  | "confident"
  | "witty"
  | "authoritative"
  | "emotional"
  | "casual"
  | "formal"
  | "sarcastic";

// Content goals
export type ContentGoal =
  | "engagement"
  | "personal-branding"
  | "education"
  | "promotion"
  | "follower-growth"
  | "affiliate";

export type AffiliateStoryAngle =
  | "problem-solution"
  | "honest-review"
  | "accidental-discovery"
  | "before-after"
  | "step-by-step";

export type AffiliateCtaPlacement = "last_tweet" | "reply";

export interface AffiliateProduct {
  productName: string;
  productUrl?: string;
  affiliateUrl: string;
  price?: string;
  keyPoints?: string[];
  storyAngle?: AffiliateStoryAngle;
  disclosureTag?: string;
  ctaPlacement?: AffiliateCtaPlacement;
}

export interface AffiliateConfig {
  enabled: boolean;
  product?: AffiliateProduct;
}

// Language options
export type Language = "id" | "en";

// Display labels for UI
export const WRITING_STYLE_LABELS: Record<WritingStyle, string> = {
  professional: "Professional",
  casual: "Casual",
  storytelling: "Storytelling",
  educational: "Educational",
  humorous: "Humorous",
  controversial: "Controversial",
  persuasive: "Persuasive",
  inspirational: "Inspirational",
  news: "News-style",
};

export const TONE_LABELS: Record<Tone, string> = {
  friendly: "Friendly",
  confident: "Confident",
  witty: "Witty",
  authoritative: "Authoritative",
  emotional: "Emotional",
  casual: "Casual",
  formal: "Formal",
  sarcastic: "Sarcastic",
};

export const CONTENT_GOAL_LABELS: Record<ContentGoal, string> = {
  engagement: "Engagement",
  "personal-branding": "Personal Branding",
  education: "Education",
  promotion: "Promotion",
  "follower-growth": "Follower Growth",
  affiliate: "Affiliate Storytelling",
};

export const AFFILIATE_STORY_ANGLE_LABELS: Record<AffiliateStoryAngle, string> = {
  "problem-solution": "Problem & Solusi",
  "honest-review": "Review Jujur / Komparasi",
  "accidental-discovery": "Penemuan Tidak Sengaja",
  "before-after": "Before & After",
  "step-by-step": "Panduan & Rekomendasi Alat",
};

export const AFFILIATE_CTA_PLACEMENT_LABELS: Record<AffiliateCtaPlacement, string> = {
  last_tweet: "Final Tweet of Thread",
  reply: "Separate Reply",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

export const TWEET_LENGTH_LABELS: Record<TweetLength, string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
};
