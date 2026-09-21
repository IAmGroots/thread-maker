import "server-only";

// AI traffic now flows through the multi-provider gateway
// (config/ai-providers + lib/ai/gateway). Generate completions with
// failover by priority via the gateway's `generateCompletion`.
export { generateCompletion } from "@/lib/ai/gateway";

/**
 * Strip characters that are illegal inside JSON strings (control chars other
 * than \t \n \r) and stray NUL/escape artifacts some providers emit. These
 * commonly appear as garbled bytes in otherwise-valid responses.
 */
function stripIllegalControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/**
 * Attempt to repair a truncated JSON payload by closing any unterminated
 * strings/objects/arrays. This is the most common failure mode when the model
 * hits its max_tokens ceiling mid-output.
 *
 * Returns the repaired string, or null if it cannot be sensibly repaired.
 */
function repairTruncatedJSON(input: string): string | null {
  const text = input.trim();
  if (!text) return null;

  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  let lastNonSpace = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch === "{" ? "}" : "]");
    } else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
    lastNonSpace = ch;
  }

  // Close an unterminated string first.
  let repaired = text;
  if (inString) {
    repaired += '"';
  }

  // Drop a dangling trailing comma / colon before closing containers.
  repaired = repaired.replace(/[,:\s]+$/, "");

  // Close any still-open containers in reverse order.
  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

/**
 * Run every JSON.parse strategy and return the first success.
 * Strategies are ordered cheapest/most-likely first.
 */
function attemptParse<T>(input: string): T | null {
  const candidates: string[] = [];
  const trimmed = input.trim();

  candidates.push(trimmed);

  // Fenced code block: ```json ... ```
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) {
    candidates.push(fence[1].trim());
  }

  // Substring between first opening and last closing bracket/brace.
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  const endIdx = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
  if (startIdx !== -1 && endIdx > startIdx) {
    candidates.push(trimmed.slice(startIdx, endIdx + 1).trim());
  }
  if (startIdx !== -1) {
    // Handle truncated payloads that never reached a closing bracket.
    candidates.push(trimmed.slice(startIdx));
  }

  // Try each candidate raw, then with illegal control chars stripped, then
  // with trailing-comma cleanup, then with truncation repair applied.
  for (const candidate of candidates) {
    const variants = [
      candidate,
      stripIllegalControlChars(candidate),
      candidate.replace(/,\s*([}\]])/g, "$1"),
      stripIllegalControlChars(candidate).replace(/,\s*([}\]])/g, "$1"),
    ];

    for (const variant of variants) {
      try {
        return JSON.parse(variant) as T;
      } catch {
        // try next variant
      }
    }

    // Last resort for this candidate: repair a truncated payload.
    const repaired = repairTruncatedJSON(stripIllegalControlChars(candidate));
    if (repaired) {
      try {
        return JSON.parse(repaired) as T;
      } catch {
        // give up on this candidate
      }
    }
  }

  return null;
}

// Models often wrap JSON in prose, a markdown fence, or return truncated
// output, so fall through the strategies below until one parses.
export function parseJSONResponse<T>(response: string): T {
  const parsed = attemptParse<T>(response);
  if (parsed !== null) {
    return parsed;
  }

  // Log only a length fingerprint: the raw response can contain user content.
  console.error(
    `Failed to parse JSON response (${response.length} chars, not valid JSON).`,
  );
  throw new Error(
    "Failed to parse AI response. The response was not valid JSON.",
  );
}
