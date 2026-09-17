import { NextRequest, NextResponse } from "next/server";
import { generateCompletion, parseJSONResponse } from "@/lib/ai/client";
import { SYSTEM_PROMPT, buildAdjustLengthPrompt } from "@/lib/ai/prompts";
import { AdjustLengthRequest } from "@/types/generator";
import { countTwitterChars, hasEmojis, extractHashtags } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body: AdjustLengthRequest & { tweetContent: string } =
      await request.json();
    const { tweetContent, direction } = body;

    if (!tweetContent || !direction) {
      return NextResponse.json(
        { success: false, error: "Tweet content and direction are required" },
        { status: 400 },
      );
    }

    // Build prompt for adjusting length
    const userPrompt = buildAdjustLengthPrompt(tweetContent, direction);

    // Generate adjusted content
    const response = await generateCompletion(SYSTEM_PROMPT, userPrompt);

    // Parse response
    const parsed = parseJSONResponse<{ content: string }>(response);

    // Process tweet
    const processedTweet = {
      content: parsed.content,
      charCount: countTwitterChars(parsed.content),
      hasEmoji: hasEmojis(parsed.content),
      hashtags: extractHashtags(parsed.content),
    };

    return NextResponse.json({
      success: true,
      tweet: processedTweet,
    });
  } catch (error) {
    console.error("Adjust Length API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
