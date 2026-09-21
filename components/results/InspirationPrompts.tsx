"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PenLine,
  Cpu,
  Briefcase,
  TrendingUp,
  HeartPulse,
  Flame,
  Wallet,
  GraduationCap,
  Gamepad2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { pickRandomTopics, SuggestedTopic } from "@/lib/prompts/topic-pool";
import { STORAGE_KEYS } from "@/types/storage";
import { UILocale } from "@/lib/i18n/types";

interface InspirationPromptsProps {
  onSelectPrompt: (topic: string) => void;
}

/**
 * Map a topic category to a meaningful icon. Deterministic (derived purely
 * from the category string) so SSR and the client always agree — no hydration
 * mismatch. Unknown categories fall back to a neutral icon.
 */
function iconForCategory(category: string) {
  const c = category.toLowerCase();
  if (/teknologi|tech|\bai\b|kode|code|software/.test(c)) return Cpu;
  if (/bisnis|business|startup|umkm/.test(c)) return Briefcase;
  if (/karier|career|produktivitas|productivity/.test(c)) return TrendingUp;
  if (/kesehatan|health|gaya hidup|lifestyle|wellness/.test(c))
    return HeartPulse;
  if (/budaya|culture|tren|trend|internet|meme|viral/.test(c)) return Flame;
  if (/uang|finance|finansial|money|keuangan/.test(c)) return Wallet;
  if (/edukasi|education|belajar|learning|kursus/.test(c)) return GraduationCap;
  if (/gaming|game|hiburan|entertainment/.test(c)) return Gamepad2;
  return PenLine;
}
// How many topics are visible at once.
const TOPIC_COUNT = 4;
// How many topics we ask the AI for per request (one request serves many clicks).
const AI_FETCH_COUNT = 30;

function bufferKey(locale: UILocale): string {
  return `${STORAGE_KEYS.TOPIC_BUFFER}_${locale}`;
}

function readBuffer(locale: UILocale): SuggestedTopic[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(bufferKey(locale));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SuggestedTopic =>
        !!item &&
        typeof item === "object" &&
        typeof (item as SuggestedTopic).topic === "string" &&
        (item as SuggestedTopic).topic.trim().length > 0,
    );
  } catch {
    return [];
  }
}

function writeBuffer(locale: UILocale, items: SuggestedTopic[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(bufferKey(locale), JSON.stringify(items));
  } catch {
    // storage may be full or blocked — buffer is best-effort only
  }
}

export function InspirationPrompts({ onSelectPrompt }: InspirationPromptsProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();

  // Start empty so SSR and the first client render match (Math.random and the
  // persisted locale/buffer are only available after mount). Topics are seeded
  // in the effect below, avoiding a hydration mismatch.
  const [topics, setTopics] = useState<SuggestedTopic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // AI topics not yet shown, kept newest-first.
  const aiBufferRef = useRef<SuggestedTopic[]>([]);
  // Guard against overlapping refills (e.g. rapid locale changes).
  const refillingRef = useRef(false);

  /**
   * Fetch a fresh batch of AI topics and store all but the first `TOPIC_COUNT`
   * (which get displayed) into the buffer. Returns false when the request
   * fails or yields nothing useful.
   */
  const refillBuffer = useCallback(
    async (forLocale: UILocale): Promise<boolean> => {
      if (refillingRef.current) return false;
      refillingRef.current = true;
      setIsLoading(true);
      try {
        const res = await fetch("/api/suggest-topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: forLocale, count: AI_FETCH_COUNT }),
        });

        const data = await res.json();

        if (!res.ok || !data.success || !Array.isArray(data.data)) {
          throw new Error(data.error || "Failed to fetch topics");
        }

        const fresh: SuggestedTopic[] = data.data.filter(
          (item: unknown): item is SuggestedTopic =>
            !!item &&
            typeof item === "object" &&
            typeof (item as SuggestedTopic).topic === "string" &&
            (item as SuggestedTopic).topic.trim().length > 0,
        );

        if (fresh.length === 0) {
          throw new Error("Empty topics response");
        }

        // Show the first batch, buffer the rest.
        setTopics(fresh.slice(0, TOPIC_COUNT));
        const rest = fresh.slice(TOPIC_COUNT);
        aiBufferRef.current = rest;
        writeBuffer(forLocale, rest);
        return true;
      } catch {
        return false;
      } finally {
        refillingRef.current = false;
        setIsLoading(false);
      }
    },
    [],
  );

  // Seed local topics instantly, then hydrate the AI buffer per locale.
  useEffect(() => {
    let cancelled = false;

    setTopics(pickRandomTopics(locale, TOPIC_COUNT));

    const stored = readBuffer(locale);
    aiBufferRef.current = stored;

    // Only spend an API call when we don't have enough buffered topics to
    // serve the next few shuffles. If storage already holds a healthy buffer,
    // skip the request entirely.
    if (stored.length < TOPIC_COUNT) {
      void refillBuffer(locale).then((ok) => {
        if (!ok && !cancelled) {
          // Local topics are already showing; just notify quietly.
          toast({ title: t.prompts.aiError });
        }
      });
    }

    return () => {
      cancelled = true;
    };
    // Re-run when the interface language changes so topics match the locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const handleRefresh = useCallback(async () => {
    const buffered = aiBufferRef.current;

    // Fast path: serve from the buffer without any API request.
    if (buffered.length >= TOPIC_COUNT) {
      setTopics(buffered.slice(0, TOPIC_COUNT));
      const rest = buffered.slice(TOPIC_COUNT);
      aiBufferRef.current = rest;
      writeBuffer(locale, rest);
      return;
    }

    // Buffer is running low: show a local topic immediately, then refill.
    setTopics((prev) =>
      pickRandomTopics(
        locale,
        TOPIC_COUNT,
        prev.map((p) => p.topic),
      ),
    );

    const ok = await refillBuffer(locale);
    if (!ok) {
      toast({ title: t.prompts.aiError });
    }
  }, [locale, refillBuffer, t.prompts.aiError, toast]);

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <div className="flex items-start gap-4 mb-3">
        <div className="rounded-lg bg-secondary p-2.5 text-foreground">
          <PenLine className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground">
            {t.prompts.heading}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.prompts.description}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.prompts.suggestedTopics}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {t.prompts.refreshingButton}
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {t.prompts.refreshButton}
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4" aria-live="polite">
          {topics.length === 0
            ? Array.from({ length: TOPIC_COUNT }).map((_, index) => (
                <div
                  key={`placeholder-${index}`}
                  className="flex w-full items-start gap-3 rounded-lg border bg-background p-3.5"
                >
                  <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-secondary" />
                  <div className="flex flex-1 flex-col gap-2 min-w-0">
                    <div className="h-2.5 w-20 animate-pulse rounded bg-secondary" />
                    <div className="h-3.5 w-full animate-pulse rounded bg-secondary" />
                  </div>
                </div>
              ))
            : topics.map((prompt) => {
                const Icon = iconForCategory(prompt.category);
                return (
                  <button
                    key={prompt.topic}
                    type="button"
                    onClick={() => onSelectPrompt(prompt.topic)}
                    className="group flex w-full items-start gap-3 rounded-lg border bg-background p-3.5 text-left transition-colors hover:bg-secondary/60 hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="text-muted-foreground transition-colors group-hover:text-foreground">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex flex-1 flex-col min-w-0">
                      <span className="inline-block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 group-hover:text-foreground">
                        {prompt.category}
                      </span>
                      <p className="text-sm font-medium text-muted-foreground leading-snug group-hover:text-foreground">
                        {prompt.topic}
                      </p>
                    </div>
                  </button>
                );
              })}
        </div>
      </div>
    </div>
  );
}
