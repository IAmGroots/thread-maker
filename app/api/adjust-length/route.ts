import { NextRequest, NextResponse } from "next/server";
import { generateCompletion, parseJSONResponse } from "@/lib/ai/client";
import { SYSTEM_PROMPT_MICRO, buildAdjustLengthPrompt } from "@/lib/ai/prompts";
import { validateAIConfig } from "@/config/ai-provider";
import { adjustLengthRequestSchema } from "@/lib/validations/generator";
import { countThreadsChars, hasEmojis, extractHashtags } from "@/lib/utils";
import { apiErrorResponse } from "@/lib/security/apiError";
import { guardAIRequest, creditsExhaustedResponse } from "@/lib/security/aiGuard";

export async function POST(request: NextRequest) {
  const guard = await guardAIRequest(request, "/api/adjust-length");
  if (!guard.user) return guard.response;

  let charged = false;

  try {
    const configValidation = validateAIConfig();
    if (!configValidation.valid) {
      return NextResponse.json(
        { success: false, error: configValidation.error },
        { status: 500 },
      );
    }

    const rawBody = await request.json().catch(() => null);
    const validationResult = adjustLengthRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    const { tweetContent, direction } = validationResult.data;

    if (!(await guard.consume())) {
      return creditsExhaustedResponse();
    }
    charged = true;

    const userPrompt = buildAdjustLengthPrompt(tweetContent, direction);

    const response = await generateCompletion(SYSTEM_PROMPT_MICRO, userPrompt);

    const parsed = parseJSONResponse<unknown>(response);
    let extractedContent = "";
    if (typeof parsed === "string") {
      extractedContent = parsed;
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      extractedContent =
        (typeof obj.content === "string" && obj.content) ||
        (typeof obj.text === "string" && obj.text) ||
        (typeof obj.tweet === "string" && obj.tweet) ||
        "";
    }

    if (!extractedContent) {
      throw new Error("Invalid response format from AI");
    }

    const processedTweet = {
      content: extractedContent,
      charCount: countThreadsChars(extractedContent),
      hasEmoji: hasEmojis(extractedContent),
      hashtags: extractHashtags(extractedContent),
    };

    return NextResponse.json({
      success: true,
      tweet: processedTweet,
    });
  } catch (error) {
    if (charged) await guard.refund().catch(() => {});
    return apiErrorResponse(error, "adjust-length");
  }
}
