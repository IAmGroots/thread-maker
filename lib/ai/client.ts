import "server-only";
import OpenAI from "openai";
import { AI_CONFIG } from "@/config/ai-provider";

export const openai = new OpenAI({
  apiKey: AI_CONFIG.apiKey,
  baseURL: AI_CONFIG.endpoint,
  dangerouslyAllowBrowser: false, // Only use on server-side
});

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(
      "Failed to generate content. Please check your API configuration.",
    );
  }
}

// Models often wrap JSON in prose or a markdown fence, so fall through
// the strategies below until one parses.
export function parseJSONResponse<T>(response: string): T {
  const cleaned = response.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through to next strategy
  }

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // fall through to substring extraction
    }
  }

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const endIdx = Math.max(lastBrace, lastBracket);

  if (startIdx !== -1 && endIdx > startIdx) {
    const candidate = cleaned.slice(startIdx, endIdx + 1).trim();
    try {
      return JSON.parse(candidate);
    } catch {
      // last resort: drop trailing commas the model sometimes leaves behind
      try {
        const sanitized = candidate.replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(sanitized);
      } catch (error) {
        console.error("JSON Parse Error on extracted candidate:", error);
      }
    }
  }

  console.error("Failed to parse JSON response. Raw response was:", response);
  throw new Error(
    "Failed to parse AI response. The response was not valid JSON.",
  );
}
