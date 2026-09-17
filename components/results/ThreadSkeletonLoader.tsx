"use client";

import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ThreadSkeletonLoaderProps {
  numberOfTweets?: number;
}

export function ThreadSkeletonLoader({
  numberOfTweets = 3,
}: ThreadSkeletonLoaderProps) {
  const { t } = useI18n();
  const count = Math.max(1, numberOfTweets);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="rounded-xl border bg-card p-6 text-card-foreground space-y-5"
    >
      {/* Header status */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t.skeleton.status}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.skeleton.description}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {t.common.tweets(count)}
        </span>
      </div>

      {/* Skeleton cards */}
      <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-background/60 p-4 space-y-3 animate-pulse"
          >
            {/* Meta row */}
            <div className="flex justify-between items-center">
              <div className="h-4 w-12 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>

            {/* Content text lines */}
            <div className="space-y-2">
              <div className="h-3.5 w-full rounded bg-muted" />
              <div className="h-3.5 w-11/12 rounded bg-muted" />
              <div className="h-3.5 w-4/5 rounded bg-muted" />
            </div>

            {/* Actions row */}
            <div className="flex gap-2 pt-1">
              <div className="h-8 flex-1 rounded bg-muted" />
              <div className="h-8 flex-1 rounded bg-muted" />
              <div className="h-8 flex-1 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">{t.skeleton.srOnly}</span>
    </div>
  );
}
