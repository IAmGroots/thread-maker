import "server-only";
import OpenAI from "openai";
import { AIProvider, getAIProviders } from "@/config/ai-providers";

/**
 * Single door for all AI traffic.
 *
 * Reads the provider registry from `config/ai-providers` and performs
 * "failover by priority": the lowest-priority provider is tried first; on
 * failure (network error, timeout, rate limit, 5xx) the next provider is tried.
 *
 * OpenAI client instances are cached per provider id so repeated calls reuse
 * the same underlying connection pool.
 */

// Per-request timeout for a single provider attempt.
const REQUEST_TIMEOUT_MS = 60_000;

const TEMPERATURE = 0.8;

// Max output tokens per request. Large threads (many tweets x many versions)
// can exceed the old 2000-token ceiling, which truncated the JSON and broke
// parsing. Configurable via AI_MAX_TOKENS; defaults to a safer 4000.
function getMaxTokens(): number {
  const raw = process.env.AI_MAX_TOKENS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 4000;
}

const clientCache = new Map<string, OpenAI>();

interface ChatChoice {
  message?: { content?: string | null } | null;
  finish_reason?: string | null;
}

interface ChatCompletionLike {
  choices?: ChatChoice[] | null;
}

/**
 * Some OpenAI-compatible gateways reply with `Content-Type: text/plain`, so the
 * SDK does NOT auto-parse the body and hands back a raw string. Others return a
 * well-formed object. This normalizes both shapes so downstream code can always
 * read `.choices`. Returns null when the payload cannot be understood.
 */
function coerceChatResponse(raw: unknown): ChatCompletionLike | null {
  if (raw && typeof raw === "object") {
    return raw as ChatCompletionLike;
  }

  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        return parsed as ChatCompletionLike;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function getClient(provider: AIProvider): OpenAI {
  const cached = clientCache.get(provider.id);
  if (cached) {
    return cached;
  }

  const client = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
    defaultHeaders: provider.extraHeaders,
    timeout: REQUEST_TIMEOUT_MS,
    dangerouslyAllowBrowser: false, // Only use on server-side
  });

  clientCache.set(provider.id, client);
  return client;
}

/**
 * Generate a completion through the gateway.
 *
 * Signature is intentionally identical to the previous single-provider
 * implementation so existing route handlers need no changes.
 */
export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const { providers, warning } = getAIProviders();

  if (warning) {
    console.warn(`AI Gateway notice: ${warning}`);
  }

  if (providers.length === 0) {
    console.error("AI Gateway Error: no providers configured.");
    throw new Error(
      "Failed to generate content. Please check your API configuration.",
    );
  }

  let lastError: unknown = null;

  for (const provider of providers) {
    try {
      const client = getClient(provider);

      const response = (await client.chat.completions.create({
        model: provider.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: TEMPERATURE,
        max_tokens: getMaxTokens(),
      })) as unknown;

      // Handle both object and raw-string (text/plain) responses.
      const completion = coerceChatResponse(response);

      if (!completion || !Array.isArray(completion.choices)) {
        // Log only a length fingerprint, never the raw payload, which can hold
        // upstream internals or reflected user content.
        const size =
          typeof response === "string"
            ? response.length
            : (JSON.stringify(response) ?? "").length;
        throw new Error(
          `Malformed upstream response (no "choices", ${size} chars).`,
        );
      }

      const choice = completion.choices[0];
      const content = choice?.message?.content || "";

      if (content.trim().length === 0) {
        throw new Error("Empty response from provider.");
      }

      // Truncation is the usual cause of invalid JSON downstream. Warn loudly
      // (but still return it — the parser can often repair truncated output).
      if (choice?.finish_reason === "length") {
        console.warn(
          `AI Gateway: provider "${provider.id}" hit the max_tokens limit (finish_reason=length). Output may be truncated. Consider raising AI_MAX_TOKENS.`,
        );
      }

      return content;
    } catch (error) {
      lastError = error;
      // Log the provider id and error class, but not the message (which can
      // carry internal hostnames or upstream URLs).
      const kind = error instanceof Error ? error.name : typeof error;
      console.warn(
        `AI Gateway: provider "${provider.id}" failed (priority ${provider.priority}, ${kind}). Trying next provider...`,
      );
      // fall through to the next provider
    }
  }

  console.error("AI Gateway Error: all providers failed.", lastError);
  throw new Error(
    "Failed to generate content. Please check your API configuration.",
  );
}
