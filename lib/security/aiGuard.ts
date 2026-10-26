import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/security/requireUser";
import { checkRateLimit, rateLimitHeaders } from "@/lib/security/rateLimit";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import {
  consumeUsage,
  refundUsage,
  CREDITS_PER_AI_REQUEST,
} from "@/lib/billing/usage";

type GuardedUser = { id: string; email?: string };

export type AIGuardResult =
  | {
      user: GuardedUser;
      workspaceId: string;
      /** Reserve credits right before the provider call. */
      consume: () => Promise<boolean>;
      /** Give the credits back when the provider call fails. */
      refund: () => Promise<void>;
      response: null;
    }
  | { user: null; response: NextResponse };

/**
 * Every AI route costs provider credit, so it requires a signed-in user, a
 * per-user budget, and available plan credits. Validation runs before
 * `consume()`, so a malformed request never costs the user anything.
 *
 * Cheap helper routes (topic suggestions) pass `chargeCredits: false`: they
 * still get auth and rate limiting but do not spend the user's plan credits,
 * because the composer calls them on its own.
 */
export async function guardAIRequest(
  request: NextRequest,
  pathname: string,
  options: { chargeCredits?: boolean } = {},
): Promise<AIGuardResult> {
  const chargeCredits = options.chargeCredits ?? true;

  try {
    const auth = await requireUser();
    if (!auth.user) {
      return { user: null, response: auth.response };
    }

    const limit = await checkRateLimit(`user:${auth.user.id}`, pathname);
    if (!limit.success) {
      return {
        user: null,
        response: NextResponse.json(
          {
            success: false,
            error: "Too many requests. Please wait a moment before trying again.",
            retryAfter: limit.resetSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(limit.resetSeconds),
              ...rateLimitHeaders(limit),
            },
          },
        ),
      };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return {
        user: null,
        response: NextResponse.json(
          { success: false, error: "No workspace found for this account." },
          { status: 403 },
        ),
      };
    }

    return {
      user: auth.user,
      workspaceId: workspace.id,
      consume: () =>
        chargeCredits
          ? consumeUsage(workspace.id, "ai_credits", CREDITS_PER_AI_REQUEST)
          : Promise.resolve(true),
      refund: () =>
        chargeCredits
          ? refundUsage(workspace.id, "ai_credits", CREDITS_PER_AI_REQUEST)
          : Promise.resolve(),
      response: null,
    };
  } catch (error) {
    console.error("[ai-guard]", error);
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          error: "Something went wrong while preparing your request. Please try again.",
        },
        { status: 500 },
      ),
    };
  }
}

export function creditsExhaustedResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: "You have used all AI credits for this month on your current plan.",
      code: "ai_credits_exhausted",
    },
    { status: 402 },
  );
}
