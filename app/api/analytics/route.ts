import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { syncAnalytics } from "@/lib/analytics/sync";
import { apiErrorResponse } from "@/lib/security/apiError";
import { checkRateLimit, rateLimitHeaders } from "@/lib/security/rateLimit";

function rangeStart(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const daysParam = Number(new URL(request.url).searchParams.get("days") ?? 30);
    const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;
    const since = rangeStart(days);

    const { data: snapshots, error } = await supabase
      .from("analytics_snapshots")
      .select(
        "id, provider_post_id, post_target_id, social_account_id, captured_at, views, likes, comments, shares, quotes, engagement_rate",
      )
      .eq("workspace_id", workspace.id)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true });

    if (error) throw new Error(error.message);

    // Keep only the latest snapshot per post, then aggregate.
    const latestByPost = new Map<string, NonNullable<typeof snapshots>[number]>();
    for (const snapshot of snapshots ?? []) {
      latestByPost.set(snapshot.provider_post_id, snapshot);
    }

    const posts = Array.from(latestByPost.values());

    const totals = posts.reduce(
      (acc, post) => {
        acc.views += post.views ?? 0;
        acc.likes += post.likes ?? 0;
        acc.comments += post.comments ?? 0;
        acc.shares += post.shares ?? 0;
        acc.quotes += post.quotes ?? 0;
        return acc;
      },
      { views: 0, likes: 0, comments: 0, shares: 0, quotes: 0 },
    );

    const interactions =
      totals.likes + totals.comments + totals.shares + totals.quotes;
    const engagementRate =
      totals.views > 0 ? Number((interactions / totals.views).toFixed(4)) : 0;

    const topPosts = [...posts]
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 5);

    const lastCaptured = posts.reduce<string | null>((latest, post) => {
      if (!latest) return post.captured_at;
      return new Date(post.captured_at) > new Date(latest) ? post.captured_at : latest;
    }, null);

    return NextResponse.json({
      success: true,
      range: { days, since },
      totals: { ...totals, engagementRate, posts: posts.length },
      topPosts,
      lastCaptured,
    });
  } catch (error) {
    return apiErrorResponse(error, "analytics-get", 500);
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const workspace = await getCurrentWorkspace();
    if (!user || !workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const limit = await checkRateLimit(user.id, "/api/analytics:sync");
    if (!limit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many syncs. Please wait a few minutes before trying again.",
          retryAfter: limit.resetSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.resetSeconds),
            ...rateLimitHeaders(limit),
          },
        },
      );
    }

    const summary = await syncAnalytics(workspace.id);
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return apiErrorResponse(error, "analytics-sync", 500);
  }
}
