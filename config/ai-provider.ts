import "server-only";

// AI Provider Configuration
export const AI_CONFIG = {
  endpoint: process.env.OPENAI_API_ENDPOINT || "",
  apiKey: process.env.OPENAI_API_KEY || "",
  model: process.env.OPENAI_MODEL_NAME || "",
  temperature: 0.8,
  maxTokens: 2000,
};

// Validate API configuration
export function validateAIConfig(): { valid: boolean; error?: string } {
  if (!AI_CONFIG.apiKey) {
    console.error("AI Configuration Error: OPENAI_API_KEY is missing in server environment.");
    return {
      valid: false,
      error: "AI service configuration error. Please contact the administrator.",
    };
  }

  if (!AI_CONFIG.endpoint) {
    console.error("AI Configuration Error: OPENAI_API_ENDPOINT is missing in server environment.");
    return {
      valid: false,
      error: "AI service configuration error. Please contact the administrator.",
    };
  }

  return { valid: true };
}
