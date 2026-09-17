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
    return {
      valid: false,
      error:
        "OPENAI_API_KEY is not configured. Please add it to your .env.local file.",
    };
  }

  if (!AI_CONFIG.endpoint) {
    return {
      valid: false,
      error: "OPENAI_API_ENDPOINT is not configured.",
    };
  }

  return { valid: true };
}
