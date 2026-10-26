"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useThreadsAccounts } from "@/hooks/use-threads-accounts";
import { createClient } from "@/lib/supabase/client";
import { buildMonthGrid, dayKey, moveToDay } from "@/lib/calendar/grid";

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
  status: TargetStatus;
  scheduled_for: string | null;
  error_message: string | null;
}

export default function CalendarPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const { accounts } = useThreadsAccounts();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<QueueItem | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const response = await fetch("/api/threads/schedule");
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.calendar.loadFailed);
      }
      setItems(data.posts ?? []);
    } catch (error) {
      if (!silent) {
        setLoadError(error instanceof Error ? error.message : t.calendar.loadFailed);
      }
    } finally {
      setIsLoading(false);
    }
  }, [t.calendar.loadFailed]);

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

  // Keep statuses fresh while a publish is running in the background.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [load]);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);

  const filtered = useMemo(() => {
    if (accountFilter === "all") return items;
    return items.filter((item) => item.threads_account_id === accountFilter);
  }, [items, accountFilter]);

  const byDay = useMemo(() => {
    const map = new Map<string, QueueItem[]>();
    for (const item of filtered) {
      if (!item.scheduled_for) continue;
      if (item.status === "published") continue;
      const key = dayKey(new Date(item.scheduled_for));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.scheduled_for ?? 0).getTime() -
          new Date(b.scheduled_for ?? 0).getTime(),
      );
    }
    return map;
  }, [filtered]);

  const monthLabel = useMemo(
    () =>
      new Date(cursor.year, cursor.month, 1).toLocaleDateString(
        locale === "id" ? "id-ID" : "en-US",
        { month: "long", year: "numeric" },
      ),
    [cursor, locale],
  );

  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 1); // a Monday
    return Array.from({ length: 7 }, (_, index) =>
      new Date(base.getFullYear(), base.getMonth(), base.getDate() + index).toLocaleDateString(
        locale === "id" ? "id-ID" : "en-US",
        { weekday: "short" },
      ),
    );
  }, [locale]);

  function moveMonth(delta: number) {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  async function handleMoveToDay(itemId: string, target: Date) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item || !item.scheduled_for) return;

    const original = new Date(item.scheduled_for);
    if (dayKey(original) === dayKey(target)) return;

    const next = moveToDay(original, target);

    setBusyId(itemId);
    try {
      const response = await fetch(`/api/targets/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: next.toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.calendar.moveFailed);

      setItems((prev) =>
        prev.map((entry) =>
          entry.id === itemId
            ? { ...entry, scheduled_for: next.toISOString(), status: "scheduled" }
            : entry,
        ),
      );
      toast({ title: t.calendar.moved });
    } catch (error) {
      toast({
        title: t.calendar.moveFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
      setDraggingId(null);
      setDropTarget(null);
    }
  }

  function openReschedule(item: QueueItem) {
    const base = item.scheduled_for ? new Date(item.scheduled_for) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setRescheduleItem(item);
    setRescheduleValue(
      `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`,
    );
  }

  async function saveReschedule() {
    if (!rescheduleItem || !rescheduleValue) return;
    const itemId = rescheduleItem.id;
    setBusyId(itemId);
    try {
      const next = new Date(rescheduleValue);
      const response = await fetch(`/api/targets/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: next.toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.calendar.moveFailed);

      setItems((prev) =>
        prev.map((entry) =>
          entry.id === itemId
            ? { ...entry, scheduled_for: next.toISOString(), status: "scheduled" }
            : entry,
        ),
      );
      setRescheduleItem(null);
      toast({ title: t.queue.rescheduled });
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

  return (
    <>
      <Header />
      <main className="bg-background text-foreground">
        <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b pb-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                {t.calendar.title}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t.calendar.title}
              </h1>
              <p className="text-sm text-muted-foreground max-w-prose">
                {t.calendar.subtitle}
              </p>
            </div>
            <Button asChild variant="outline" className="min-h-[44px] shrink-0">
              <Link href="/queue">
                <CalendarDays className="h-4 w-4 mr-1.5" aria-hidden="true" />
                {t.calendar.openQueue}
              </Link>
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveMonth(-1)}
              aria-label={t.calendar.previous}
              className="min-h-[44px] min-w-[44px]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <p className="text-sm font-semibold tabular-nums min-w-[9rem] text-center">
              {monthLabel}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveMonth(1)}
              aria-label={t.calendar.next}
              className="min-h-[44px] min-w-[44px]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                setCursor({ year: now.getFullYear(), month: now.getMonth() });
              }}
              className="min-h-[44px]"
            >
              {t.calendar.today}
            </Button>

            <label htmlFor="calendar-account" className="sr-only">
              {t.calendar.filterAccount}
            </label>
            <select
              id="calendar-account"
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value)}
              className="ml-auto min-h-[44px] rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">{t.calendar.allAccounts}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  @{account.username}
                </option>
              ))}
            </select>
          </div>

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
              <Button variant="outline" onClick={() => void load()} className="min-h-[44px]">
                {t.calendar.retry}
              </Button>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border">
                {weekdays.map((label) => (
                  <div
                    key={label}
                    className="px-2 py-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground text-center"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {grid.map((cell) => {
                  const dayItems = byDay.get(cell.key) ?? [];
                  const isDropTarget = dropTarget === cell.key && draggingId !== null;


  return (
                    <div
                      key={cell.key}
                      onDragOver={(event) => {
                        if (!draggingId) return;
                        event.preventDefault();
                        setDropTarget(cell.key);
                      }}
                      onDragLeave={() => {
                        if (dropTarget === cell.key) setDropTarget(null);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggingId) void handleMoveToDay(draggingId, cell.date);
                      }}
                      className={`min-h-[92px] sm:min-h-[116px] border-b border-r border-border p-1.5 space-y-1 transition-colors ${
                        cell.inMonth ? "bg-background" : "bg-muted/20"
                      } ${isDropTarget ? "bg-secondary/60 ring-2 ring-inset ring-primary/40" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-mono tabular-nums ${
                            cell.isToday
                              ? "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-primary-foreground"
                              : cell.inMonth
                                ? "text-foreground"
                                : "text-muted-foreground/60"
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                        {dayItems.length > 0 && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {dayItems.length}
                          </span>
                        )}
                      </div>

                      {isDropTarget && (
                        <p className="text-[10px] text-primary leading-tight">
                          {t.calendar.dropHint}
                        </p>
                      )}

                      <ul className="space-y-1 max-h-[68px] overflow-y-auto pr-0.5">
                        {dayItems.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              draggable={item.status !== "publishing"}
                              onDragStart={() => setDraggingId(item.id)}
                              onDragEnd={() => {
                                setDraggingId(null);
                                setDropTarget(null);
                              }}
                              onClick={() => openReschedule(item)}
                              disabled={busyId === item.id}
                              aria-label={`${t.queue.reschedule} ${new Date(
                                item.scheduled_for ?? 0,
                              ).toLocaleTimeString(
                                locale === "id" ? "id-ID" : "en-US",
                                { hour: "2-digit", minute: "2-digit" },
                              )}`}
                              className={`w-full text-left rounded px-1.5 py-1 text-[10px] sm:text-[11px] leading-tight border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                item.status === "failed" || item.status === "partial_published"
                                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                                  : "border-border bg-secondary/60 text-foreground"
                              } ${draggingId === item.id ? "opacity-50" : ""}`}
                              title={item.error_message ?? undefined}
                            >
                              <span className="font-mono tabular-nums">
                                {new Date(item.scheduled_for ?? 0).toLocaleTimeString(
                                  locale === "id" ? "id-ID" : "en-US",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isLoading && !loadError && byDay.size === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">{t.calendar.emptyMonth}</p>
          )}
        </div>
      </main>

      <Dialog
        open={rescheduleItem !== null}
        onOpenChange={(next) => !next && setRescheduleItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.queue.rescheduleTitle}</DialogTitle>
            <DialogDescription>{t.calendar.subtitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label
              htmlFor="calendar-reschedule-when"
              className="text-xs font-medium text-foreground"
            >
              {t.schedule.whenLabel}
            </label>
            <Input
              id="calendar-reschedule-when"
              type="datetime-local"
              value={rescheduleValue}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(event) => setRescheduleValue(event.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleItem(null)}
              className="min-h-[44px]"
            >
              {t.common.cancel}
            </Button>
            <Button onClick={() => void saveReschedule()} className="min-h-[44px]">
              {t.queue.rescheduleSave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
