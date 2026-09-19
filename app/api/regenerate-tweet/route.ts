import { NextRequest, NextResponse } from "next/server";
import { generateCompletion, parseJSONResponse } from "@/lib/ai/client";
import { SYSTEM_PROMPT_MICRO, buildRegenerateTweetPrompt } from "@/lib/ai/prompts";
import { validateAIConfig } from "@/config/ai-provider";
import { regenerateTweetRequestSchema } from "@/lib/validations/generator";
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
    const validationResult = regenerateTweetRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    const { tweetIndex, context } = validationResult.data;

    const userPrompt = buildRegenerateTweetPrompt(
      tweetIndex,
      context.length,
      context,
      {},
    );

    const response = await generateCompletion(SYSTEM_PROMPT_MICRO, userPrompt);

    const parsed = parseJSONResponse<unknown>(response);
    let extractedContent = "";
    let order = tweetIndex + 1;

    if (typeof parsed === "string") {
      extractedContent = parsed;
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      extractedContent =
        (typeof obj.content === "string" && obj.content) ||
        (typeof obj.text === "string" && obj.text) ||
        (typeof obj.tweet === "string" && obj.tweet) ||
        "";
      if (typeof obj.order === "number") {
        order = obj.order;
      }
    }

    if (!extractedContent) {
      throw new Error("Invalid response format from AI");
    }

    const charCount = countTwitterChars(extractedContent);

    const processedTweet = {
      content: extractedContent,
      order,
      charCount,
      hasEmoji: hasEmojis(extractedContent),
      hashtags: extractHashtags(extractedContent),
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
