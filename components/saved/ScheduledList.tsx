"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useThreadsAccounts } from "@/hooks/use-threads-accounts";
import {
  CalendarClock,
  Loader2,
  AlertCircle,
  X,
  RotateCw,
  ExternalLink,
} from "lucide-react";

type ScheduledStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "partial_published"
  | "failed";

interface ScheduledPost {
  id: string;
  threads_account_id: string | null;
  saved_thread_id: string | null;
  status: ScheduledStatus;
  scheduled_for: string | null;
  threads_post_id: string | null;
  error_message: string | null;
  published_at: string | null;
  attempts: number;
  created_at: string;
}

export function ScheduledList({ refreshKey }: { refreshKey?: number }) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { accounts } = useThreadsAccounts();

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/threads/schedule");
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load schedules");
      }
      setPosts(data.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const accountName = useCallback(
    (id: string | null) => {
      if (!id) return "";
      const account = accounts.find((a) => a.id === id);
      return account ? `@${account.username}` : "";
    },
    [accounts],
  );

  const formatWhen = useCallback(
    (iso: string | null) => {
      if (!iso) return "";
      return new Date(iso).toLocaleString(locale === "id" ? "id-ID" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    },
    [locale],
  );

  const statusLabel: Record<ScheduledStatus, string> = {
    draft: t.schedule.statusScheduled,
    scheduled: t.schedule.statusScheduled,
    publishing: t.schedule.statusPublishing,
    published: t.schedule.statusPublished,
    partial_published: t.schedule.statusPartial,
    failed: t.schedule.statusFailed,
  };

  async function handleCancel(id: string) {
    setBusyId(id);
    try {
      const response = await fetch("/api/threads/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error();
      toast({ title: t.schedule.canceledToast });
      await load();
    } catch {
      toast({ title: t.schedule.cancelFailed, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleRetry(id: string) {
    setBusyId(id);
    try {
      const response = await fetch("/api/threads/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error();
      await load();
    } catch {
      toast({ title: t.schedule.scheduleFailed, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
        {t.schedule.sectionHeading}
      </h2>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t.schedule.scheduling}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{t.schedule.scheduleFailed}</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center space-y-1">
          <p className="text-sm font-medium text-foreground">{t.schedule.noSchedulesYet}</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">{t.schedule.emptyHint}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {posts.map((post) => {
            const isBusy = busyId === post.id;
            const canCancel =
              post.status === "scheduled" || post.status === "failed" || post.status === "draft";
            const canRetry =
              post.status === "failed" || post.status === "partial_published";
            const account = accountName(post.threads_account_id);

            return (
              <li
                key={post.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        post.status === "failed"
                          ? "destructive"
                          : post.status === "published"
                            ? "outline"
                            : "secondary"
                      }
                      className="text-xs font-normal"
                    >
                      {statusLabel[post.status]}
                    </Badge>
                    {account && (
                      <span className="text-xs text-muted-foreground">{account}</span>
                    )}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono tabular-nums">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatWhen(post.scheduled_for)}
                  </p>
                  {post.status === "failed" && post.error_message && (
                    <p className="text-xs text-destructive break-words">{post.error_message}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {post.status === "published" && post.threads_post_id && account && (
                    <a
                      href={`https://www.threads.net/${account}/post/${post.threads_post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 min-h-[44px] px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      {t.schedule.viewPost}
                    </a>
                  )}

                  {canRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(post.id)}
                      disabled={isBusy}
                      className="min-h-[44px] px-3 text-xs"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <RotateCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                      )}
                      {t.schedule.retryAction}
                    </Button>
                  )}

                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(post.id)}
                      disabled={isBusy}
                      className="min-h-[44px] px-3 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                      {t.schedule.cancelAction}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
