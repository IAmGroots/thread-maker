import { NextRequest, NextResponse } from "next/server";
import { generateCompletion, parseJSONResponse } from "@/lib/ai/client";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";
import { GenerateRequest, GenerateResponse } from "@/types/generator";
import { validateAIConfig } from "@/config/ai-provider";
import { countTwitterChars, hasEmojis, extractHashtags } from "@/lib/utils";

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

    // Parse request body
    const body: GenerateRequest = await request.json();
    const { config } = body;

    // Validate request
    if (!config.topic || config.topic.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Topic is required" },
        { status: 400 },
      );
    }

    if (config.language && config.language !== "id" && config.language !== "en") {
      return NextResponse.json(
        { success: false, error: "Language must be either 'id' or 'en'" },
        { status: 400 },
      );
    }

    // Build prompts
    const systemPrompt = SYSTEM_PROMPT;
    const userPrompt = buildUserPrompt(config);

    // Generate content
    const response = await generateCompletion(systemPrompt, userPrompt);

    // Parse response
    const parsed =
      parseJSONResponse<
        Array<{ tweets: Array<{ content: string; order: number }> }>
      >(response);

    // Validate and process response
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Invalid response format from AI");
    }

    // Process each version
    const threads = parsed.map((version) => {
      if (!version.tweets || !Array.isArray(version.tweets)) {
        throw new Error("Invalid tweets structure in response");
      }

      // Sort tweets by order
      const sortedTweets = version.tweets.sort((a, b) => a.order - b.order);

      // Process each tweet
      const processedTweets = sortedTweets.map((tweet) => {
        const charCount = countTwitterChars(tweet.content);

        // Validate length
        if (charCount > 280) {
          console.warn(
            `Tweet ${tweet.order} exceeds 280 characters (${charCount})`,
          );
        }

        return {
          content: tweet.content,
          order: tweet.order,
          charCount,
          hasEmoji: hasEmojis(tweet.content),
          hashtags: extractHashtags(tweet.content),
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
