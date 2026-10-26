import "server-only";

import { fetchWithTimeout } from "@/lib/http/fetchTimeout";

const THREADS_GRAPH_URL = "https://graph.threads.net/v1.0";

// Threads exposes these per-media metrics. Missing ones are simply absent from
// the response, so callers treat every value as optional.
export const THREADS_METRICS = [
  "views",
  "likes",
  "replies",
  "reposts",
  "quotes",
] as const;

export interface ThreadsInsightMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  quotes?: number;
  raw: Record<string, unknown>;
}

interface InsightDatum {
  name?: string;
  values?: Array<{ value?: number }>;
  total_value?: { value?: number };
}

function readValue(datum: InsightDatum): number | undefined {
  if (typeof datum.total_value?.value === "number") {
    return datum.total_value.value;
  }
  const first = datum.values?.[0]?.value;
  return typeof first === "number" ? first : undefined;
}

/**
 * Turn the Graph API insights payload into normalized metrics. Unknown metric
 * names stay in `raw` so a future metric does not require a code change.
 */
export function parseThreadsInsights(payload: {
  data?: InsightDatum[];
}): ThreadsInsightMetrics {
  const metrics: ThreadsInsightMetrics = { raw: {} };

  for (const datum of payload.data ?? []) {
    const name = datum.name;
    if (!name) continue;

    const value = readValue(datum);
    if (value === undefined) continue;

    (metrics.raw as Record<string, number>)[name] = value;

    switch (name) {
      case "views":
        metrics.views = value;
        break;
      case "likes":
        metrics.likes = value;
        break;
      case "replies":
        metrics.comments = value;
        break;
      case "reposts":
        metrics.shares = value;
        break;
      case "quotes":
        metrics.quotes = value;
        break;
    }
  }

  return metrics;
}

/**
 * Fetch insights for one published Threads post.
 *
 * Returns null when the API rejects the call (missing scope, deleted post, or
 * a post that is too new to have data), so the caller can skip it instead of
 * failing the whole sync.
 */
export async function fetchThreadsInsights(
  accessToken: string,
  mediaId: string,
): Promise<ThreadsInsightMetrics | null> {
  const params = new URLSearchParams({
    metric: THREADS_METRICS.join(","),
    access_token: accessToken,
  });

  const response = await fetchWithTimeout(
    `${THREADS_GRAPH_URL}/${encodeURIComponent(mediaId)}/insights?${params.toString()}`,
  );

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { data?: InsightDatum[] };
  return parseThreadsInsights(json);
}
