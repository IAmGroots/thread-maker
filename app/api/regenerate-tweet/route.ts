import { NextRequest, NextResponse } from "next/server";
import { generateCompletion, parseJSONResponse } from "@/lib/ai/client";
import { SYSTEM_PROMPT, buildRegenerateTweetPrompt } from "@/lib/ai/prompts";
import { RegenerateTweetRequest } from "@/types/generator";
import { countTwitterChars, hasEmojis, extractHashtags } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body: RegenerateTweetRequest = await request.json();
    const { tweetIndex, context } = body;

    if (tweetIndex === undefined || !Array.isArray(context)) {
      return NextResponse.json(
        { success: false, error: "Invalid request parameters" },
        { status: 400 },
      );
    }

    // Build prompt for regenerating single tweet
    const userPrompt = buildRegenerateTweetPrompt(
      tweetIndex,
      context.length,
      context,
      {}, // You can pass config if needed
    );

    // Generate new tweet
    const response = await generateCompletion(SYSTEM_PROMPT, userPrompt);

    // Parse response
    const parsed = parseJSONResponse<{ content: string; order: number }>(
      response,
    );

    // Process tweet
    const charCount = countTwitterChars(parsed.content);

    const processedTweet = {
      content: parsed.content,
      order: parsed.order,
      charCount,
      hasEmoji: hasEmojis(parsed.content),
      hashtags: extractHashtags(parsed.content),
    };

    return NextResponse.json({
      success: true,
      tweet: processedTweet,
    });
  } catch (error) {
    console.error("Regenerate Tweet API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
