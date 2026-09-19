import { NextRequest, NextResponse } from "next/server";
import { generateCompletion, parseJSONResponse } from "@/lib/ai/client";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";
import { GenerateResponse } from "@/types/generator";
import { validateAIConfig } from "@/config/ai-provider";
import { generateRequestSchema } from "@/lib/validations/generator";
import { countTwitterChars, hasEmojis, extractHashtags } from "@/lib/utils";

interface RawTweet {
  content?: string;
  text?: string;
  tweet?: string;
  order?: number;
}

function extractTweetContent(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as RawTweet;
    if (typeof obj.content === "string") return obj.content;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.tweet === "string") return obj.tweet;
  }
  return "";
}

function normalizeTweetsList(rawList: unknown[]): Array<{ content: string; order: number }> {
  return rawList
    .map((item, idx) => {
      const content = extractTweetContent(item);
      const order =
        item && typeof item === "object" && typeof (item as RawTweet).order === "number"
          ? (item as RawTweet).order!
          : idx + 1;
      return { content, order };
    })
    .filter((t) => t.content.trim().length > 0)
    .sort((a, b) => a.order - b.order);
}

function normalizeAIResponse(
  parsed: unknown,
): Array<{ tweets: Array<{ content: string; order: number }> }> {
  if (!parsed) return [];

  // Object variations
  if (typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;

    // Case: { threads: [...] } or { versions: [...] } or { results: [...] } or { data: [...] }
    const wrapperList = obj.threads || obj.versions || obj.results || obj.data;
    if (Array.isArray(wrapperList)) {
      return normalizeAIResponse(wrapperList);
    }

    // Case: { tweets: [...] }
    if (Array.isArray(obj.tweets)) {
      const normalizedTweets = normalizeTweetsList(obj.tweets);
      if (normalizedTweets.length > 0) {
        return [{ tweets: normalizedTweets }];
      }
    }

    // Case: Single tweet object { content: "...", order: 1 }
    const singleContent = extractTweetContent(obj);
    if (singleContent) {
      return [{ tweets: [{ content: singleContent, order: 1 }] }];
    }
  }

  // Array variations
  if (Array.isArray(parsed)) {
    // Array of version objects containing .tweets: [{ tweets: [...] }, ...]
    const hasVersionsWithTweets = parsed.some(
      (item) =>
        item &&
        typeof item === "object" &&
        Array.isArray((item as Record<string, unknown>).tweets),
    );

    if (hasVersionsWithTweets) {
      return parsed
        .map((version) => {
          if (!version || typeof version !== "object") return null;
          const tweetsRaw = (version as Record<string, unknown>).tweets;
          if (!Array.isArray(tweetsRaw)) return null;
          const tweets = normalizeTweetsList(tweetsRaw);
          return tweets.length > 0 ? { tweets } : null;
        })
        .filter(
          (v): v is { tweets: Array<{ content: string; order: number }> } =>
            v !== null,
        );
    }

    // Array of tweets directly: [{ content: "...", order: 1 }, ...]
    const normalizedTweets = normalizeTweetsList(parsed);
    if (normalizedTweets.length > 0) {
      return [{ tweets: normalizedTweets }];
    }
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    // Validate API configuration
    const configValidation = validateAIConfig();
    if (!configValidation.valid) {
      return NextResponse.json(
        { success: false, error: configValidation.error },
        { status: 500 },
      );
    }

    // Parse and validate request body with Zod
    const rawBody = await request.json();
    const validationResult = generateRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }
    const { config } = validationResult.data;

    // Build prompts
    const systemPrompt = SYSTEM_PROMPT;
    const userPrompt = buildUserPrompt(config);

    // Generate content
    const response = await generateCompletion(systemPrompt, userPrompt);

    // Parse response
    const parsedRaw = parseJSONResponse<unknown>(response);

    // Normalize AI response to handle all variations
    const normalizedVersions = normalizeAIResponse(parsedRaw);

    if (normalizedVersions.length === 0) {
      throw new Error("Invalid response format from AI");
    }

    // Process each version
    const threads = normalizedVersions.map((version) => {
      const processedTweets = version.tweets.map((tweet) => {
        let content = tweet.content;
        if (content.includes("[AFFILIATE_LINK]")) {
          content = content.replace(/\[AFFILIATE_LINK\]/g, "").replace(/\s{2,}/g, " ").trim();
        }
        const charCount = countTwitterChars(content);

        return {
          content,
          order: tweet.order,
          charCount,
          hasEmoji: hasEmojis(content),
          hashtags: extractHashtags(content),
        };
      });

      return { tweets: processedTweets };
    });

    const result: GenerateResponse = {
      success: true,
      threads,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        threads: [],
      },
      { status: 500 },
    );
  }
}
