import { NextRequest, NextResponse } from "next/server";
import { generateCompletion, parseJSONResponse } from "@/lib/ai/client";
import { SYSTEM_PROMPT_MICRO, buildTransformPrompt } from "@/lib/ai/prompts";
import { validateAIConfig } from "@/config/ai-provider";
import { transformRequestSchema } from "@/lib/validations/generator";
import { countTwitterChars, hasEmojis, extractHashtags } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const configValidation = validateAIConfig();
    if (!configValidation.valid) {
      return NextResponse.json(
        { success: false, error: configValidation.error },
        { status: 500 },
      );
    }

    const rawBody = await request.json();
    const validationResult = transformRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    const { tweets, newStyle, newTone } = validationResult.data;

    const userPrompt = buildTransformPrompt(tweets, newStyle, newTone);

    const response = await generateCompletion(SYSTEM_PROMPT_MICRO, userPrompt);

    const parsed = parseJSONResponse<unknown>(response);

    let rawList: Array<{ content?: string; text?: string; order?: number }> = [];
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.tweets)) {
        rawList = obj.tweets;
      }
    }

    if (rawList.length === 0) {
      throw new Error("Invalid response format from AI");
    }

    const processedTweets = rawList.map((tweet, index) => {
      const content = tweet.content || tweet.text || "";
      const order = typeof tweet.order === "number" ? tweet.order : index + 1;
      return {
        content,
        order,
        charCount: countTwitterChars(content),
        hasEmoji: hasEmojis(content),
        hashtags: extractHashtags(content),
      };
    });

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
