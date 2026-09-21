import "server-only";
import { NextResponse } from "next/server";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Turn an unknown thrown value into an HTTP error response for an API route.
 *
 * The thrown message can carry upstream detail (provider names, hostnames, raw
 * payload snippets). In production we log the full detail server-side and send
 * only a generic message to the client; in development we surface the message
 * so local debugging stays easy.
 */
export function apiErrorResponse(
  error: unknown,
  context: string,
  status = 500,
  extra: Record<string, unknown> = {},
): NextResponse {
  console.error(`[${context}]`, error);

  const genericMessage =
    "Something went wrong while processing your request. Please try again.";

  const message = IS_PRODUCTION
    ? genericMessage
    : error instanceof Error
      ? error.message
      : String(error);

  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}
