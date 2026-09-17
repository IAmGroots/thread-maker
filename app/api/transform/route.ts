import { NextRequest, NextResponse } from "next/server";
import { generateCompletion, parseJSONResponse } from "@/lib/ai/client";
import { SYSTEM_PROMPT, buildTransformPrompt } from "@/lib/ai/prompts";
import { TransformStyleRequest } from "@/types/generator";
import { countTwitterChars, hasEmojis, extractHashtags } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body: TransformStyleRequest & { tweets: string[] } =
      await request.json();
    const { tweets, newStyle, newTone } = body;

    if (!Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tweets array is required" },
        { status: 400 },
      );
    }

    // Build prompt for transforming
    const userPrompt = buildTransformPrompt(tweets, newStyle, newTone);

    // Generate transformed content
    const response = await generateCompletion(SYSTEM_PROMPT, userPrompt);

    // Parse response
    const parsed =
      parseJSONResponse<Array<{ content: string; order: number }>>(response);

    // Process tweets
    const processedTweets = parsed.map((tweet) => ({
      content: tweet.content,
      order: tweet.order,
      charCount: countTwitterChars(tweet.content),
      hasEmoji: hasEmojis(tweet.content),
      hashtags: extractHashtags(tweet.content),
    }));

    return NextResponse.json({
      success: true,
      tweets: processedTweets,
    });
  } catch (error) {
    console.error("Transform API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
