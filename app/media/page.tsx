"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Trash2, Upload } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { formatBytes } from "@/lib/utils";

interface MediaAsset {
  id: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  created_at: string;
  url: string | null;
}

interface Usage {
  usedBytes: number;
  limitBytes: number;
}

const ACCEPTED = "image/jpeg,image/png";
const MAX_BYTES = 8 * 1024 * 1024;

export default function MediaPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [altDraft, setAltDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/media");
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.media.loadFailed);
      }
      setAssets(data.assets ?? []);
      setUsage(data.usage ?? null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t.media.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }, [t.media.loadFailed]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast({ title: t.media.uploadFailed, description: t.media.unsupported, variant: "destructive" });
      return;
    }

    if (file.size > MAX_BYTES) {
      toast({ title: t.media.uploadFailed, description: t.media.tooLarge, variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.media.uploadFailed);
      }

      setAssets((prev) => [data.asset as MediaAsset, ...prev]);
      setUsage((prev) =>
        prev
          ? { ...prev, usedBytes: prev.usedBytes + Number(data.asset.size_bytes) }
          : prev,
      );
    } catch (error) {
      toast({
        title: t.media.uploadFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveAlt(asset: MediaAsset) {
    const value = altDraft[asset.id] ?? asset.alt_text ?? "";
    setBusyId(asset.id);
    try {
      const response = await fetch("/api/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id, altText: value }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.media.uploadFailed);
      }

      setAssets((prev) =>
        prev.map((item) =>
          item.id === asset.id ? { ...item, alt_text: value.trim() || null } : item,
        ),
      );
      setAltDraft((prev) => {
        const next = { ...prev };
        delete next[asset.id];
        return next;
      });
      toast({ title: t.media.altSaved });
    } catch (error) {
      toast({
        title: t.media.uploadFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(asset: MediaAsset) {
    setBusyId(asset.id);
    try {
      const response = await fetch(`/api/media?id=${encodeURIComponent(asset.id)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.media.deleteFailed);
      }

      setAssets((prev) => prev.filter((item) => item.id !== asset.id));
      setUsage((prev) =>
        prev
          ? { ...prev, usedBytes: Math.max(0, prev.usedBytes - Number(asset.size_bytes)) }
          : prev,
      );
      setConfirmId(null);
      toast({ title: t.media.deleted });
    } catch (error) {
      toast({
        title: t.media.deleteFailed,
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
        <div className="container mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b pb-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                {t.media.title}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t.media.title}
              </h1>
              <p className="text-sm text-muted-foreground max-w-prose">
                {t.media.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {usage && (
                <p className="text-xs font-mono tabular-nums text-muted-foreground">
                  {t.media.usage(formatBytes(usage.usedBytes), formatBytes(usage.limitBytes))}
                </p>
              )}
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="min-h-[44px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                    {t.media.uploading}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    {t.media.upload}
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                aria-label={t.media.upload}
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border bg-card p-3 space-y-3">
                  <div className="aspect-square rounded-lg bg-muted/40" />
                  <div className="h-3 w-2/3 rounded bg-muted/40" />
                </div>
              ))}
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
                {t.media.retry}
              </Button>
            </div>
          ) : assets.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed bg-card px-6 py-12 text-center space-y-2">
              <h2 className="text-base font-semibold">{t.media.empty}</h2>
              <p className="text-sm text-muted-foreground">{t.media.emptyHint}</p>
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {assets.map((asset) => {
                const draft = altDraft[asset.id];
                const currentAlt = draft ?? asset.alt_text ?? "";
                const dirty = draft !== undefined && draft !== (asset.alt_text ?? "");

                return (
                  <li key={asset.id} className="rounded-xl border bg-card p-3 space-y-3">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted/30">
                      {asset.url ? (
                        <Image
                          src={asset.url}
                          alt={asset.alt_text ?? ""}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          {t.media.loadFailed}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={`alt-${asset.id}`}
                        className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        {t.media.altLabel}
                      </label>
                      <Input
                        id={`alt-${asset.id}`}
                        value={currentAlt}
                        placeholder={t.media.altPlaceholder}
                        onChange={(event) =>
                          setAltDraft((prev) => ({ ...prev, [asset.id]: event.target.value }))
                        }
                        className="min-h-[44px] text-sm"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                          {formatBytes(Number(asset.size_bytes))}
                        </span>
                        {dirty && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void saveAlt(asset)}
                            disabled={busyId === asset.id}
                            className="min-h-[44px]"
                          >
                            {t.media.saveAlt}
                          </Button>
                        )}
                      </div>
                    </div>

                    {confirmId === asset.id ? (
                      <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-2">
                        <p className="text-xs text-destructive">{t.media.confirmDelete}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void remove(asset)}
                            disabled={busyId === asset.id}
                            className="min-h-[44px] flex-1"
                          >
                            {busyId === asset.id ? t.media.deleting : t.media.delete}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmId(null)}
                            disabled={busyId === asset.id}
                            className="min-h-[44px] flex-1"
                          >
                            {t.media.cancelDelete}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmId(asset.id)}
                        className="min-h-[44px] w-full text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                        {t.media.delete}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
