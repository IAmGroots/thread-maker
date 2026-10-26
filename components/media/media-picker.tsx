"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export interface MediaOption {
  id: string;
  url: string | null;
  alt_text: string | null;
}

interface CacheEntry {
  assets: MediaOption[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

async function loadMedia(): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch("/api/media");
      const data = await response.json();
      if (!response.ok || !data.success) return;

      cache = {
        assets: (data.assets ?? []).map((asset: MediaOption) => ({
          id: asset.id,
          url: asset.url,
          alt_text: asset.alt_text,
        })),
        fetchedAt: Date.now(),
      };
      notify();
    } catch {
      // The picker is optional; an empty list just means no image to attach.
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Media list shared by every picker on the page. A module cache keeps the
 * publish and schedule dialogs from each fetching the library separately.
 */
export function useMediaAssets(enabled: boolean) {
  const [assets, setAssets] = useState<MediaOption[]>(cache?.assets ?? []);
  const [isLoading, setIsLoading] = useState(!cache && enabled);

  useEffect(() => {
    if (!enabled) return;

    const listener = () => {
      setAssets(cache?.assets ?? []);
      setIsLoading(false);
    };

    listeners.add(listener);

    if (!cache || Date.now() - cache.fetchedAt > CACHE_TTL_MS) {
      setIsLoading(true);
      void loadMedia();
    } else {
      listener();
    }

    return () => {
      listeners.delete(listener);
    };
  }, [enabled]);

  return { assets, isLoading };
}

interface MediaPickerProps {
  value: string;
  onChange: (mediaId: string) => void;
  enabled: boolean;
  disabled?: boolean;
  /** Prefix so two pickers on the same page keep unique ids. */
  idPrefix: string;
}

export function MediaPicker({
  value,
  onChange,
  enabled,
  disabled = false,
  idPrefix,
}: MediaPickerProps) {
  const { t } = useI18n();
  const { assets, isLoading } = useMediaAssets(enabled);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span id={`${idPrefix}-label`} className="text-xs font-medium text-foreground">
          {t.media.attachLabel}
        </span>
        <Link
          href="/media"
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t.media.manage}
        </Link>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">{t.common.loading}</p>
      ) : (
        <div
          role="group"
          aria-labelledby={`${idPrefix}-label`}
          className="flex gap-2 overflow-x-auto pb-1"
        >
          <button
            type="button"
            onClick={() => onChange("")}
            aria-pressed={value === ""}
            disabled={disabled}
            className={`shrink-0 h-16 min-w-[64px] rounded-md border px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
              value === ""
                ? "border-primary bg-secondary text-foreground font-medium"
                : "border-input text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.media.none}
          </button>

          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onChange(asset.id)}
              aria-pressed={value === asset.id}
              aria-label={asset.alt_text ?? t.media.attachLabel}
              disabled={disabled}
              className={`relative shrink-0 h-16 w-16 overflow-hidden rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                value === asset.id
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-input"
              }`}
            >
              {asset.url ? (
                <Image
                  src={asset.url}
                  alt=""
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  {t.media.loadFailed}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
