"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  Loader2,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { pollTargetStatus } from "@/lib/client/poll-target";
import { useToast } from "@/hooks/use-toast";
import { useThreadsAccounts } from "@/hooks/use-threads-accounts";
import { createClient } from "@/lib/supabase/client";

type TargetStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "partial_published"
  | "failed";

interface QueueItem {
  id: string;
  threads_account_id: string | null;
  saved_thread_id: string | null;
  status: TargetStatus;
  scheduled_for: string | null;
  threads_post_id: string | null;
  error_message: string | null;
  published_at: string | null;
  attempts: number;
  created_at: string;
  preview?: string;
}

type Filter = "all" | "scheduled" | "published" | "failed";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export default function QueuePage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const { accounts } = useThreadsAccounts();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const response = await fetch("/api/threads/schedule");
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.queue.loadFailed);
      }
      setItems(data.posts ?? []);
    } catch (error) {
      if (!silent) {
        setLoadError(error instanceof Error ? error.message : t.queue.loadFailed);
      }
    } finally {
      setIsLoading(false);
    }
  }, [t.queue.loadFailed]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      void load();
    });
  }, [router, load]);

  // A publish started elsewhere (another tab, the cron) should show up here
  // without a manual refresh.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [load]);

  const accountName = useCallback(
    (id: string | null) => {
      if (!id) return "";
      const account = accounts.find((item) => item.id === id);
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

  const visible = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "scheduled") {
      return items.filter(
        (item) => item.status === "scheduled" || item.status === "publishing",
      );
    }
    if (filter === "published") return items.filter((item) => item.status === "published");
    return items.filter(
      (item) => item.status === "failed" || item.status === "partial_published",
    );
  }, [items, filter]);

  async function runAction(id: string, action: "retry" | "publish_now") {
    setBusyId(id);
    try {
      const response = await fetch(`/api/targets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.queue.publishFailed);
      }

      if (action === "publish_now") {
        // 202 means the target is queued; follow it until the worker finishes.
        if (data.status === "publishing" || response.status === 202) {
          const final = await pollTargetStatus(id, {
            onProgress: (payload) => {
              setItems((prev) =>
                prev.map((item) =>
                  item.id === id
                    ? { ...item, status: "publishing", preview: item.preview }
                    : item,
                ),
              );
              void payload;
            },
          });

          if (!final) {
            toast({
              title: t.queue.publishing,
              description: t.publish.stillPublishingDesc,
            });
          } else if (final.status === "published") {
            toast({ title: t.queue.published });
          } else {
            toast({
              title: t.queue.publishFailed,
              description: final.error ?? undefined,
              variant: "destructive",
            });
          }
        } else if (data.status === "published") {
          toast({ title: t.queue.published });
        } else {
          toast({
            title: t.queue.publishFailed,
            description: data.error,
            variant: "destructive",
          });
        }
      }

      await load();
    } catch (error) {
      toast({
        title: action === "retry" ? t.queue.rescheduleFailed : t.queue.publishFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function cancelItem(id: string) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/targets/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.queue.cancelFailed);
      toast({ title: t.queue.canceled });
      await load();
    } catch (error) {
      toast({
        title: t.queue.cancelFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  function openReschedule(item: QueueItem) {
    const base = item.scheduled_for ? new Date(item.scheduled_for) : new Date();
    setRescheduleId(item.id);
    setRescheduleValue(toLocalInputValue(base));
  }

  async function saveReschedule() {
    if (!rescheduleId || !rescheduleValue) return;
    setBusyId(rescheduleId);
    try {
      const response = await fetch(`/api/targets/${rescheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledFor: new Date(rescheduleValue).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.queue.rescheduleFailed);
      toast({ title: t.queue.rescheduled });
      setRescheduleId(null);
      await load();
    } catch (error) {
      toast({
        title: t.queue.rescheduleFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  const statusLabel: Record<TargetStatus, string> = {
    draft: t.schedule.statusScheduled,
    scheduled: t.schedule.statusScheduled,
    publishing: t.schedule.statusPublishing,
    published: t.schedule.statusPublished,
    partial_published: t.schedule.statusPartial,
    failed: t.schedule.statusFailed,
  };

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: t.queue.filterAll },
    { id: "scheduled", label: t.queue.filterScheduled },
    { id: "published", label: t.queue.filterPublished },
    { id: "failed", label: t.queue.filterFailed },
  ];

  return (
    <>
      <Header />
      <main className="bg-background text-foreground">
        <div className="container mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b pb-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                {t.queue.title}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t.queue.title}
              </h1>
              <p className="text-sm text-muted-foreground max-w-prose">
                {t.queue.subtitle}
              </p>
            </div>
            <Button asChild variant="outline" className="min-h-[44px] shrink-0">
              <Link href="/calendar">
                <CalendarClock className="h-4 w-4 mr-1.5" aria-hidden="true" />
                {t.queue.openCalendar}
              </Link>
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label={t.queue.filterAll}>
            {filters.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                aria-pressed={filter === entry.id}
                className={`min-h-[44px] rounded-md border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  filter === entry.id
                    ? "border-primary bg-secondary text-foreground"
                    : "border-input text-muted-foreground hover:text-foreground"
                }`}
              >
                {entry.label}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void load()}
              disabled={isLoading}
              className="min-h-[44px] ml-auto text-muted-foreground"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              {t.queue.retry}
            </Button>
          </div>

          {isLoading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t.common.loading}
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-destructive"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{loadError}</span>
              </div>
              <Button variant="outline" onClick={() => void load()} className="min-h-[44px]">
                {t.queue.retry}
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed bg-card px-6 py-12 text-center space-y-2">
              <h2 className="text-base font-semibold">{t.queue.empty}</h2>
              <p className="text-sm text-muted-foreground">{t.queue.emptyHint}</p>
            </div>
          ) : (
            <ul className="mt-6 space-y-2">
              {visible.map((item) => {
                const busy = busyId === item.id;
                const canCancel = ["scheduled", "failed", "draft", "partial_published"].includes(
                  item.status,
                );
                const canRetry =
                  item.status === "failed" || item.status === "partial_published";
                const canPublish =
                  item.status === "scheduled" ||
                  item.status === "failed" ||
                  item.status === "partial_published";
                const handle = accountName(item.threads_account_id);

                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-border bg-card px-4 py-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          item.status === "failed"
                            ? "destructive"
                            : item.status === "published"
                              ? "outline"
                              : "secondary"
                        }
                        className="text-xs font-normal"
                      >
                        {statusLabel[item.status]}
                      </Badge>
                      {handle && (
                        <span className="text-xs text-muted-foreground">{handle}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {t.queue.attempts(item.attempts)}
                      </span>
                      {item.scheduled_for && (
                        <span className="text-xs font-mono text-muted-foreground sm:ml-auto">
                          {t.queue.scheduledFor(formatWhen(item.scheduled_for))}
                        </span>
                      )}
                    </div>

                    {item.preview && (
                      <p className="text-sm text-foreground/90 leading-relaxed line-clamp-2">
                        {item.preview}
                      </p>
                    )}

                    {item.error_message && (
                      <p className="text-xs text-destructive leading-relaxed">
                        {item.error_message}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {canPublish && (
                        <Button
                          size="sm"
                          onClick={() => void runAction(item.id, "publish_now")}
                          disabled={busy}
                          className="min-h-[44px]"
                        >
                          {busy ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                              {t.queue.publishing}
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1.5" aria-hidden="true" />
                              {t.queue.publishNow}
                            </>
                          )}
                        </Button>
                      )}
                      {canRetry && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void runAction(item.id, "retry")}
                          disabled={busy}
                          className="min-h-[44px]"
                        >
                          <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden="true" />
                          {t.queue.retryAction}
                        </Button>
                      )}
                      {canCancel && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReschedule(item)}
                            disabled={busy}
                            className="min-h-[44px]"
                          >
                            <CalendarClock className="h-4 w-4 mr-1.5" aria-hidden="true" />
                            {t.queue.reschedule}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCancelId(item.id)}
                            disabled={busy}
                            className="min-h-[44px] text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4 mr-1.5" aria-hidden="true" />
                            {t.queue.cancel}
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <Dialog open={rescheduleId !== null} onOpenChange={(next) => !next && setRescheduleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.queue.rescheduleTitle}</DialogTitle>
            <DialogDescription>{t.queue.subtitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label htmlFor="reschedule-when" className="text-xs font-medium text-foreground">
              {t.schedule.whenLabel}
            </label>
            <Input
              id="reschedule-when"
              type="datetime-local"
              value={rescheduleValue}
              min={toLocalInputValue(new Date())}
              onChange={(event) => setRescheduleValue(event.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleId(null)} className="min-h-[44px]">
              {t.common.cancel}
            </Button>
            <Button onClick={() => void saveReschedule()} className="min-h-[44px]">
              {t.queue.rescheduleSave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={cancelId !== null}
        onOpenChange={(next) => !next && setCancelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.queue.cancelConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.queue.cancelConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px]"
              onClick={(event) => {
                event.preventDefault();
                const id = cancelId;
                setCancelId(null);
                if (id) void cancelItem(id);
              }}
            >
              {t.queue.cancelConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
