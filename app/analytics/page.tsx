"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  RefreshCw,
  Share2,
} from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

interface AnalyticsTotals {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  quotes: number;
  engagementRate: number;
  posts: number;
}

interface TopPost {
  provider_post_id: string;
  post_target_id: string | null;
  captured_at: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

interface AnalyticsResponse {
  totals: AnalyticsTotals;
  topPosts: TopPost[];
  lastCaptured: string | null;
}

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function AnalyticsPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scopeWarning, setScopeWarning] = useState(false);

  const load = useCallback(
    async (days: Range) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/analytics?days=${days}`);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || t.analytics.loadFailed);
        }
        setData({ totals: payload.totals, topPosts: payload.topPosts, lastCaptured: payload.lastCaptured });
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : t.analytics.loadFailed);
      } finally {
        setIsLoading(false);
      }
    },
    [t.analytics.loadFailed],
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: auth }) => {
      if (!auth.user) {
        router.replace("/login");
        return;
      }
      void load(range);
    });
  }, [router, load, range]);

  async function sync() {
    setIsSyncing(true);
    setScopeWarning(false);
    try {
      const response = await fetch("/api/analytics", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t.analytics.syncFailed);
      }

      if (payload.summary?.accountsMissingScope > 0) {
        setScopeWarning(true);
      } else {
        toast({ title: t.analytics.synced });
      }

      await load(range);
    } catch (error) {
      toast({
        title: t.analytics.syncFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  const rangeLabel: Record<Range, string> = {
    7: t.analytics.range7,
    30: t.analytics.range30,
    90: t.analytics.range90,
  };

  const metrics = data
    ? [
        { key: "views", label: t.analytics.views, value: formatNumber(data.totals.views), Icon: Eye },
        { key: "likes", label: t.analytics.likes, value: formatNumber(data.totals.likes), Icon: Heart },
        {
          key: "comments",
          label: t.analytics.comments,
          value: formatNumber(data.totals.comments),
          Icon: MessageCircle,
        },
        { key: "shares", label: t.analytics.shares, value: formatNumber(data.totals.shares), Icon: Share2 },
      ]
    : [];

  const lastSyncedLabel = data?.lastCaptured
    ? t.analytics.lastSynced(
        new Date(data.lastCaptured).toLocaleString(locale === "id" ? "id-ID" : "en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      )
    : t.analytics.neverSynced;

  return (
    <>
      <Header />
      <main className="bg-background text-foreground">
        <div className="container mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b pb-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                {t.analytics.title}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t.analytics.title}
              </h1>
              <p className="text-sm text-muted-foreground max-w-prose">
                {t.analytics.subtitle}
              </p>
              <p className="text-xs font-mono text-muted-foreground">{lastSyncedLabel}</p>
            </div>

            <div className="flex items-center gap-2">
              <div role="group" aria-label={t.analytics.title} className="flex items-center gap-1 rounded-md border border-input p-0.5">
                {RANGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRange(value)}
                    aria-pressed={range === value}
                    className={`min-h-[40px] rounded px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      range === value
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {rangeLabel[value]}
                  </button>
                ))}
              </div>

              <Button onClick={() => void sync()} disabled={isSyncing} className="min-h-[44px]">
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                    {t.analytics.syncing}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    {t.analytics.sync}
                  </>
                )}
              </Button>
            </div>
          </div>

          {scopeWarning && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{t.analytics.scopeMissing}</span>
            </div>
          )}

          {isLoading ? (
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t.common.loading}
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="mt-8 flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-destructive"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{loadError}</span>
              </div>
              <Button variant="outline" onClick={() => void load(range)} className="min-h-[44px]">
                {t.analytics.retry}
              </Button>
            </div>
          ) : !data || data.totals.posts === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed bg-card px-6 py-12 text-center space-y-2">
              <h2 className="text-base font-semibold">{t.analytics.empty}</h2>
              <p className="text-sm text-muted-foreground">{t.analytics.emptyHint}</p>
            </div>
          ) : (
            <>
              <ul className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {metrics.map(({ key, label, value, Icon }) => (
                  <li key={key} className="rounded-xl border border-border bg-card px-4 py-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="text-[11px] font-mono uppercase tracking-[0.12em]">
                        {label}
                      </span>
                    </div>
                    <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    {t.analytics.engagement}
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {formatPercent(data.totals.engagementRate)}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    {t.analytics.posts}
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {formatNumber(data.totals.posts)}
                  </p>
                </div>
              </div>

              <section className="mt-8 space-y-3" aria-labelledby="top-posts-heading">
                <h2
                  id="top-posts-heading"
                  className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {t.analytics.topPosts}
                </h2>

                {data.topPosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.analytics.noData}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.topPosts.map((post) => (
                      <li
                        key={`${post.provider_post_id}-${post.captured_at}`}
                        className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-border bg-card px-4 py-3"
                      >
                        <span className="text-xs font-mono text-muted-foreground">
                          {post.provider_post_id}
                        </span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatNumber(post.views ?? 0)}
                        </span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatNumber(post.likes ?? 0)}
                        </span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatNumber(post.comments ?? 0)}
                        </span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatNumber(post.shares ?? 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
