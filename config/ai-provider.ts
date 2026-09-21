import "server-only";

/**
 * Backwards-compatible entry point.
 *
 * The AI provider configuration now lives in `config/ai-providers.ts` as a
 * multi-provider registry (see `OPENAI_PROVIDERS`). This module re-exports the
 * public surface so existing imports keep working.
 */
export { getAIProviders, validateAIConfig } from "@/config/ai-providers";
export type { AIProvider, AIProvidersResult } from "@/config/ai-providers";
