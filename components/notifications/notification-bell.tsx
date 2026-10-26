"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  params: Record<string, unknown> | null;
}

const POLL_INTERVAL_MS = 60_000;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export function NotificationBell() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=10");
      if (!response.ok) return;
      const data = await response.json();
      if (!data.success) return;
      setItems(data.notifications ?? []);
      setUnreadCount(Number(data.unreadCount ?? 0));
    } catch {
      // A failed poll is not worth surfacing; the next tick retries.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const unread = unreadCount;

  async function markAllRead() {
    if (unreadCount === 0) return;

    setItems((prev) =>
      prev.map((item) =>
        item.read_at ? item : { ...item, read_at: new Date().toISOString() },
      ),
    );
    setUnreadCount(0);

    // No ids means "every unread notification", including ones older than the
    // ten shown in the popover.
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {});
  }

  function formatWhen(iso: string) {
    return new Date(iso).toLocaleString(locale === "id" ? "id-ID" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatDay(iso: string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      dateStyle: "medium",
    });
  }

  /**
   * Render from structured params so the text follows the reader's language.
   * Rows written before params existed fall back to the stored English text.
   */
  function renderNotification(item: NotificationItem): { title: string; body: string | null } {
    const params = item.params ?? {};

    switch (item.type) {
      case "publish_succeeded": {
        const handle = str(params.handle);
        const title = str(params.title);
        if (handle) {
          return {
            title: t.notifications.publishedTitle(handle),
            body: title ? t.notifications.publishedBody(title) : null,
          };
        }
        break;
      }
      case "publish_partial": {
        const handle = str(params.handle);
        if (handle) {
          return {
            title: t.notifications.partialTitle(handle),
            body: t.notifications.partialBody(num(params.count), str(params.error)),
          };
        }
        break;
      }
      case "publish_failed": {
        const handle = str(params.handle);
        if (handle) {
          return {
            title: t.notifications.failedTitle(handle),
            body: t.notifications.failedBody(str(params.error), str(params.title)),
          };
        }
        break;
      }
      case "system": {
        if (str(params.kind) === "plan_ending") {
          const plan = str(params.plan);
          const date = formatDay(str(params.date));
          return params.urgent === true
            ? {
                title: t.notifications.planEndingSoonTitle,
                body: t.notifications.planEndingSoonBody(plan, date),
              }
            : {
                title: t.notifications.planEndingWeekTitle,
                body: t.notifications.planEndingWeekBody(plan, date),
              };
        }
        break;
      }
      default:
        break;
    }

    return { title: item.title, body: item.body };
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          unread > 0 ? `${t.notifications.label} (${unread})` : t.notifications.label
        }
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative flex items-center justify-center h-11 w-11 sm:h-9 sm:w-9 rounded-full border border-border bg-secondary hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-[10px] font-semibold leading-[18px] text-destructive-foreground text-center px-1"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.notifications.label}
          className="absolute right-0 top-[calc(100%+1rem)] z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-card shadow-md"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
            <p className="text-sm font-medium text-foreground">
              {t.notifications.label}
            </p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 min-h-[44px] px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {t.notifications.markAllRead}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t.common.loading}
              </p>
            ) : items.length === 0 ? (
              <div className="px-3 py-6 text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t.notifications.empty}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.notifications.emptyHint}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const rendered = renderNotification(item);
                  const content = (
                    <div
                      className={cn(
                        "px-3 py-3 space-y-1 transition-colors",
                        !item.read_at && "bg-secondary/40",
                      )}
                    >
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {rendered.title}
                      </p>
                      {rendered.body && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {rendered.body}
                        </p>
                      )}
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {formatWhen(item.created_at)}
                      </p>
                    </div>
                  );

                  return (
                    <li key={item.id}>
                      {item.entity_type === "post_target" ? (
                        <Link
                          href="/queue"
                          role="menuitem"
                          onClick={() => setOpen(false)}
                          className="block hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
