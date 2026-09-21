import "server-only";

/**
 * Multi-provider AI gateway configuration.
 *
 * Providers are declared as a single JSON array in the `OPENAI_PROVIDERS`
 * environment variable. Each entry is an OpenAI-compatible endpoint:
 *
 *   OPENAI_PROVIDERS=[
 *     {"id":"9router","baseURL":"https://api.9router.com/v1","apiKey":"sk-...","model":"bansos","priority":1},
 *     {"id":"openrouter","baseURL":"https://openrouter.ai/api/v1","apiKey":"sk-or-...","model":"openai/gpt-4o-mini","priority":2}
 *   ]
 *
 * Priority is ascending: a lower number is tried first. When a provider fails
 * (network error, timeout, 5xx, 429), the gateway falls back to the next one.
 *
 * Backwards compatibility: if `OPENAI_PROVIDERS` is missing or malformed, the
 * gateway falls back to the legacy single-provider env vars
 * (OPENAI_API_ENDPOINT / OPENAI_API_KEY / OPENAI_MODEL_NAME).
 */

export interface AIProvider {
  id: string;
  baseURL: string;
  apiKey: string;
  model: string;
  /** Lower number = tried first. */
  priority: number;
  /** Defaults to true when omitted. */
  enabled?: boolean;
  /** Extra headers sent with every request (e.g. OpenRouter attribution). */
  extraHeaders?: Record<string, string>;
}

export type AIProvidersResult = {
  providers: AIProvider[];
  /** Human-readable reason when the registry had to fall back or failed. */
  warning?: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Parse and validate the legacy single-provider environment variables.
 */
function legacyProvider(): AIProvider | null {
  const baseURL = process.env.OPENAI_API_ENDPOINT?.trim() || "";
  const apiKey = process.env.OPENAI_API_KEY?.trim() || "";
  const model = process.env.OPENAI_MODEL_NAME?.trim() || "";

  if (!baseURL || !apiKey || !model) {
    return null;
  }

  return {
    id: "default",
    baseURL,
    apiKey,
    model,
    priority: 1,
    enabled: true,
  };
}

/**
 * Validate a single raw provider entry. Returns null when invalid.
 */
function normalizeProvider(
  raw: unknown,
  index: number,
): { provider?: AIProvider; error?: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: `entry #${index + 1} is not an object` };
  }

  const entry = raw as Record<string, unknown>;

  if (!isNonEmptyString(entry.id)) {
    return { error: `entry #${index + 1} is missing a valid "id"` };
  }
  if (!isNonEmptyString(entry.baseURL)) {
    return { error: `provider "${entry.id}" is missing a valid "baseURL"` };
  }
  if (!isNonEmptyString(entry.apiKey)) {
    return { error: `provider "${entry.id}" is missing a valid "apiKey"` };
  }
  if (!isNonEmptyString(entry.model)) {
    return { error: `provider "${entry.id}" is missing a valid "model"` };
  }

  const priority =
    typeof entry.priority === "number" && Number.isFinite(entry.priority)
      ? entry.priority
      : index + 1;

  let extraHeaders: Record<string, string> | undefined;
  if (
    entry.extraHeaders &&
    typeof entry.extraHeaders === "object" &&
    !Array.isArray(entry.extraHeaders)
  ) {
    extraHeaders = {};
    for (const [key, value] of Object.entries(
      entry.extraHeaders as Record<string, unknown>,
    )) {
      if (isNonEmptyString(value)) {
        extraHeaders[key] = value;
      }
    }
  }

  return {
    provider: {
      id: entry.id.trim(),
      baseURL: entry.baseURL.trim(),
      apiKey: entry.apiKey.trim(),
      model: entry.model.trim(),
      priority,
      enabled: entry.enabled !== false,
      extraHeaders,
    },
  };
}

/**
 * Read and parse the provider registry from the environment.
 * Never throws — malformed config degrades to the legacy provider (or empty).
 */
export function getAIProviders(): AIProvidersResult {
  const raw = process.env.OPENAI_PROVIDERS?.trim();

  if (raw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const warning =
        "OPENAI_PROVIDERS is not valid JSON. Falling back to legacy OPENAI_* variables.";
      console.error(`AI Configuration Error: ${warning}`);
      const fallback = legacyProvider();
      return { providers: fallback ? [fallback] : [], warning };
    }

    if (!Array.isArray(parsed)) {
      const warning =
        "OPENAI_PROVIDERS must be a JSON array. Falling back to legacy OPENAI_* variables.";
      console.error(`AI Configuration Error: ${warning}`);
      const fallback = legacyProvider();
      return { providers: fallback ? [fallback] : [], warning };
    }

    const providers: AIProvider[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const { provider, error } = normalizeProvider(parsed[i], i);
      if (error) {
        console.error(`AI Configuration Error: skipping provider — ${error}`);
        continue;
      }
      if (provider && provider.enabled !== false) {
        providers.push(provider);
      }
    }

    if (providers.length === 0) {
      const warning =
        "OPENAI_PROVIDERS contained no usable providers. Falling back to legacy OPENAI_* variables.";
      console.error(`AI Configuration Error: ${warning}`);
      const fallback = legacyProvider();
      return { providers: fallback ? [fallback] : [], warning };
    }

    // Ascending priority: lower number wins. Stable for equal priorities.
    providers.sort((a, b) => a.priority - b.priority);

    return { providers };
  }

  // No multi-provider config: use the legacy single provider (dev-friendly).
  const fallback = legacyProvider();
  return { providers: fallback ? [fallback] : [] };
}

/**
 * Validate that at least one usable provider is configured.
 * Messages are intentionally generic so they never leak infra details.
 */
export function validateAIConfig(): { valid: boolean; error?: string } {
  const { providers } = getAIProviders();

  if (providers.length === 0) {
    console.error(
      "AI Configuration Error: no usable AI providers found. Set OPENAI_PROVIDERS or the legacy OPENAI_API_ENDPOINT / OPENAI_API_KEY / OPENAI_MODEL_NAME variables.",
    );
    return {
      valid: false,
      error: "AI service configuration error. Please contact the administrator.",
    };
  }

  return { valid: true };
}
