import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateCompletion, parseJSONResponse } from "@/lib/ai/client";
import { validateAIConfig } from "@/config/ai-provider";
import { UILocale } from "@/lib/i18n/types";
import { SuggestedTopic } from "@/lib/prompts/topic-pool";
import { apiErrorResponse } from "@/lib/security/apiError";

/**
 * Generate fresh, general "viral / hype" topics via the AI gateway.
 *
 * This endpoint is intentionally context-free (does NOT react to the user's
 * tone/style/audience) per product decision: it returns broadly trending,
 * current-feeling topics in the requested interface locale.
 *
 * On any failure the client falls back to the local topic pool, so this route
 * simply returns a non-2xx and lets the caller decide.
 */

const suggestTopicsRequestSchema = z.object({
  locale: z.enum(["en", "id"]).default("en"),
  count: z.number().int().min(1).max(30).default(4),
});

const DEFAULT_COUNT = 4;
// Allow up to a full buffer so one request can serve many "shuffle" clicks.
const MAX_COUNT = 30;

interface RawTopic {
  category?: unknown;
  topic?: unknown;
}

function normalizeSuggestion(raw: unknown): SuggestedTopic | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as RawTopic;
  const category =
    typeof obj.category === "string" ? obj.category.trim() : "";
  const topic = typeof obj.topic === "string" ? obj.topic.trim() : "";
  if (!topic) return null;
  return {
    category: category || "Trending",
    topic,
  };
}

function normalizeTopicsList(parsed: unknown): SuggestedTopic[] {
  if (!parsed) return [];

  // { topics: [...] } | { data: [...] } | { results: [...] } | { suggestions: [...] }
  if (typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const wrapper =
      obj.topics || obj.data || obj.results || obj.suggestions;
    if (Array.isArray(wrapper)) {
      return normalizeTopicsList(wrapper);
    }
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map(normalizeSuggestion)
      .filter((t): t is SuggestedTopic => t !== null);
  }

  return [];
}

/**
 * Best-effort extraction from a response that does not parse as clean JSON.
 * The model occasionally wraps output in prose, uses single quotes, or emits
 * slightly malformed JSON. Rather than failing outright, we scrape
 * `"category": ... , "topic": ...` pairs (in any key order) and, as a last
 * resort, numbered list lines of the form `1. Topic text`.
 */
function extractTopicsFromText(raw: string): SuggestedTopic[] {
  const topics: SuggestedTopic[] = [];

  // Match objects containing category/topic string pairs in either order.
  const pairRegex =
    /\{[^{}]*?"topic"\s*:\s*"((?:[^"\\]|\\.)*)"[^{}]*?\}/gi;
  const categoryInObjectRegex =
    /"category"\s*:\s*"((?:[^"\\]|\\.)*)"/i;

  for (const match of raw.matchAll(pairRegex)) {
    const topic = unescapeJsonString(match[1]);
    if (!topic) continue;
    const categoryMatch = match[0].match(categoryInObjectRegex);
    const category = categoryMatch
      ? unescapeJsonString(categoryMatch[1])
      : "Trending";
    topics.push({ category: category || "Trending", topic });
  }

  if (topics.length > 0) {
    return topics;
  }

  // Fallback: numbered lines like `1. Some topic` or `- Some topic`.
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(?:[-*•]|\d+[.)])\s+/.test(line));

  for (const line of lines) {
    const topic = line.replace(/^(?:[-*•]|\d+[.)])\s+/, "").trim();
    if (topic) topics.push({ category: "Trending", topic });
  }

  return topics;
}

function unescapeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
  }
}

/**
 * Parse the AI response into a list of topics, tolerating both strict JSON and
 * mildly malformed prose. Never throws — returns [] when nothing is usable so
 * the caller can fall back gracefully.
 */
function parseTopics(response: string): SuggestedTopic[] {
  try {
    const parsed = parseJSONResponse<unknown>(response);
    const topics = normalizeTopicsList(parsed);
    if (topics.length > 0) return topics;
  } catch {
    // fall through to best-effort extraction
  }

  return extractTopicsFromText(response);
}

function buildSystemPrompt(locale: UILocale, count: number): string {
  const language = locale === "id" ? "Bahasa Indonesia" : "English";
  return [
    "You are a social-media content strategist.",
    `Suggest ${count} distinct, fresh, general topics that feel current and in tune with what is trending on the internet right now.`,
    `Write everything in ${language}.`,
    "Each topic should be a single, specific, engaging prompt suitable for a short social thread.",
    "Ensure no two topics are duplicates or near-duplicates.",
    "Prefer topics across a mix of categories: technology, business, career, lifestyle, internet culture, and finance.",
    "Avoid clichés, dated references, and generic filler.",
    "Return ONLY valid JSON with this exact shape:",
    '{"topics":[{"category":"short category label","topic":"the topic"}]}',
    "Do not wrap the JSON in markdown fences or add any commentary.",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const configValidation = validateAIConfig();
    if (!configValidation.valid) {
      return NextResponse.json(
        { success: false, error: configValidation.error },
        { status: 500 },
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const validation = suggestTopicsRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMsg = validation.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 },
      );
    }

    const locale = validation.data.locale as UILocale;
    const count = Math.min(validation.data.count || DEFAULT_COUNT, MAX_COUNT);

    const systemPrompt = buildSystemPrompt(locale, count);
    const userPrompt =
      locale === "id"
        ? `Berikan ${count} rekomendasi topik yang sedang tren saat ini.`
        : `Give me ${count} topics that are trending right now.`;

    const response = await generateCompletion(systemPrompt, userPrompt);
    const topics = parseTopics(response).slice(0, count);

    if (topics.length === 0) {
      throw new Error("Invalid response format from AI");
    }

    return NextResponse.json({ success: true, data: topics });
  } catch (error) {
    return apiErrorResponse(error, "suggest-topics");
  }
}
