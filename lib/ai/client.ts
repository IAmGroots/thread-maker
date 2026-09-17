import OpenAI from "openai";
import { AI_CONFIG } from "@/config/ai-provider";

// Initialize OpenAI client with custom endpoint
export const openai = new OpenAI({
  apiKey: AI_CONFIG.apiKey,
  baseURL: AI_CONFIG.endpoint,
  dangerouslyAllowBrowser: false, // Only use on server-side
});

// Generate completion
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

// Parse JSON response safely
export function parseJSONResponse<T>(response: string): T {
  try {
    // Remove any markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```\n?/g, "");
    }

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("JSON Parse Error:", error);
    console.error("Response was:", response);
    throw new Error(
      "Failed to parse AI response. The response was not valid JSON.",
    );
  }
}
