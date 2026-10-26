"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/header";
import { SavedThread } from "@/types/thread";
import { createClient } from "@/lib/supabase/client";
import {
  deleteThread,
  exportSingleThreadToTXT,
  exportSingleThreadToJSON,
  downloadFile,
  parseImportFile,
  importThreads,
  slugifyTopic,
} from "@/lib/storage/threads";
import { formatDate, truncateText, safeHttpUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useThreadsAccounts } from "@/hooks/use-threads-accounts";
import { PostToThreadsButton } from "@/components/results/PostToThreadsButton";
import { SchedulePostDialog } from "@/components/saved/SchedulePostDialog";
import { CheckCircle2, Circle } from "lucide-react";
import {
  Search,
  Trash2,
  Download,
  Copy,
  FileText,
  Hash,
  Calendar,
  ArrowUpRight,
  X,
  Library,
  Upload,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function SavedPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, locale } = useI18n();

  const [threads, setThreads] = useState<SavedThread[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredThreads, setFilteredThreads] = useState<SavedThread[]>([]);
  const [threadToDelete, setThreadToDelete] = useState<SavedThread | null>(null);
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set());

  // Server-side paging: the browser only ever holds the pages it asked for.
  const PAGE_SIZE = 20;
  const [totalThreads, setTotalThreads] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Auth + data loading states (R-27: loading, error, empty are all designed).
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selected Threads account drives the per-account "posted" badge.
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const {
    accounts,
    publishedThreadIds,
    refresh: refreshAccounts,
  } = useThreadsAccounts(selectedAccountId || undefined);
  const activeAccounts = accounts.filter(
    (account) => (account.status ?? "active") === "active",
  );

  // Focus restoration ref for delete triggers
  const triggerButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadThreads = useCallback(async (query = "", offset = 0) => {
    if (offset === 0) {
      setIsLoading(true);
      setLoadError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (query.trim()) params.set("query", query.trim());

      const response = await fetch(`/api/library?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "unknown");
      }

      const page = (data.threads ?? []) as SavedThread[];
      setThreads((prev) => (offset === 0 ? page : [...prev, ...page]));
      setFilteredThreads((prev) => (offset === 0 ? page : [...prev, ...page]));
      setTotalThreads(Number(data.total ?? page.length));
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "unknown");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Require authentication: the library lives in the database now.
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!selectedAccountId && activeAccounts.length > 0) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

  useEffect(() => {
    if (!authChecked) return;

    const q = searchQuery.trim();
    const timer = window.setTimeout(() => {
      void loadThreads(q, 0);
    }, q ? 300 : 0);

    return () => window.clearTimeout(timer);
  }, [authChecked, searchQuery, loadThreads]);

  const toggleExpanded = (id: string) => {
    setExpandedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLoadToStudio = (thread: SavedThread) => {
    try {
      sessionStorage.setItem(
        "threvo_load_thread",
        JSON.stringify(thread)
      );
    } catch (e) {
      console.error("Failed to store thread in sessionStorage:", e);
    }
    router.push("/generator");
  };

  const confirmDelete = async () => {
    if (!threadToDelete) return;
    const deletedId = threadToDelete.metadata.id;
    try {
      await deleteThread(deletedId);
      await loadThreads(searchQuery, 0);
      toast({
        title: t.toasts.deleted,
        description: t.toasts.deletedDesc,
      });
    } catch (error) {
      toast({
        title: t.toasts.saveFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
    setThreadToDelete(null);
  };

  const handleCopy = async (thread: SavedThread) => {
    const formattedThread = thread.tweets
      .map(
        (tweet) =>
          `${tweet.order}/${thread.totalTweets}\n\n${tweet.content.replace(/\[AFFILIATE_LINK\]/g, "").trim()}`
      )
      .join("\n\n---\n\n");

    const success = await copyToClipboard(formattedThread);

    if (success) {
      toast({
        title: t.toasts.copied,
        description: t.toasts.threadCopiedDesc,
      });
    }
  };

  const handleDownloadSingleTXT = (thread: SavedThread) => {
    const txt = exportSingleThreadToTXT(thread);
    const slug = slugifyTopic(thread.metadata.topic);
    downloadFile(txt, `thread-${slug}-${Date.now()}.txt`, "text/plain");
    toast({
      title: t.toasts.exported,
      description: t.toasts.exportedTxtDesc,
    });
  };

  const handleDownloadSingleJSON = (thread: SavedThread) => {
    const json = exportSingleThreadToJSON(thread);
    const slug = slugifyTopic(thread.metadata.topic);
    downloadFile(json, `thread-${slug}-${Date.now()}.json`, "application/json");
    toast({
      title: t.toasts.exported,
      description: t.toasts.exportedJsonDesc,
    });
  };

  const handleExportAll = async (format: "json" | "txt") => {
    try {
      const params = new URLSearchParams({ format });
      if (searchQuery.trim()) params.set("query", searchQuery.trim());

      const response = await fetch(`/api/library/export?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || t.history.loadFailed);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `threads-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast({
        title: t.toasts.exported,
        description:
          format === "json" ? t.toasts.exportedJsonDesc : t.toasts.exportedTxtDesc,
      });
    } catch (error) {
      toast({
        title: t.toasts.exported,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleExportJSON = () => void handleExportAll("json");
  const handleExportTXT = () => void handleExportAll("txt");

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = String(event.target?.result || "");
        const parsedThreads = parseImportFile(content, file.name);

        if (parsedThreads.length > 0) {
          const result = await importThreads(parsedThreads);
          await loadThreads(searchQuery, 0);
          toast({
            title: t.toasts.imported,
            description: t.toasts.importedDesc(result.importedCount),
          });
        } else {
          toast({
            title: t.toasts.importFailed,
            description: t.toasts.importFailedDesc,
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error parsing import file:", err);
        toast({
          title: t.toasts.importFailed,
          description: t.toasts.importFailedDesc,
          variant: "destructive",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      toast({
        title: t.toasts.importFailed,
        description: t.toasts.importFailedDesc,
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };

  return (
    <>
      <Header />
      <main className="min-h-full bg-background text-foreground">
        <div className="container mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {(!authChecked || isLoading) && !loadError ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-24 text-center"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{t.history.loadingLibrary}</p>
            </div>
          ) : loadError ? (
            <div className="rounded-xl border bg-card p-8 sm:p-12 text-center text-card-foreground">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
                  <AlertCircle className="h-6 w-6" aria-hidden="true" />
                </div>
                <div role="alert">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    {t.history.loadFailed}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    {t.history.loadFailedDesc}
                  </p>
                </div>
                <Button
                  onClick={() => void loadThreads(searchQuery, 0)}
                  className="min-h-[44px] px-4 font-medium"
                >
                  {t.history.retry}
                </Button>
              </div>
            </div>
          ) : (
            <>
          <div className="flex flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t.history.title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {t.history.countSaved(totalThreads)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {activeAccounts.length > 0 && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="saved-account-filter"
                    className="text-xs text-muted-foreground hidden sm:inline"
                  >
                    {t.publish.accountFilterLabel}
                  </label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                  >
                    <SelectTrigger
                      id="saved-account-filter"
                      className="min-h-[44px] w-[180px] text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          @{account.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,text/plain,application/json"
                onChange={handleFileImport}
                className="hidden"
                aria-label={t.history.importAria}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="min-h-[44px] px-3 text-xs font-medium"
                aria-label={t.history.importAria}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                {t.history.import}
              </Button>

              {threads.length > 0 && (
                <>
                  <Button
                    onClick={handleExportJSON}
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] px-3 text-xs font-medium"
                    aria-label={t.history.exportJson}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    JSON
                  </Button>
                  <Button
                    onClick={handleExportTXT}
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] px-3 text-xs font-medium"
                    aria-label={t.history.exportTxt}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    TXT
                  </Button>
                </>
              )}
            </div>
          </div>

          {threads.length > 0 && (
            <div className="relative">
              <label htmlFor="library-search" className="sr-only">
                {t.history.searchPlaceholder}
              </label>
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="library-search"
                type="text"
                placeholder={t.history.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 min-h-[44px] text-base sm:text-sm bg-card"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label={t.history.clearSearch}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-medium text-foreground">{t.queue.title}</p>
              <Link
                href="/queue"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline min-h-[44px]"
              >
                {t.publish.openQueue}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => {
                const isExpanded = expandedThreadIds.has(thread.metadata.id);

                return (
                  <article
                    key={thread.metadata.id}
                    className="rounded-xl border bg-card p-5 sm:p-6 text-card-foreground shadow-sm space-y-4 transition-colors hover:border-foreground/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        <h2 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                          {thread.metadata.topic}
                        </h2>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-mono tabular-nums">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{formatDate(thread.metadata.createdAt, locale)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{t.common.tweets(thread.totalTweets)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {thread.totalChars} {t.common.chars}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start shrink-0 flex-wrap">
                        {activeAccounts.length > 0 && (
                          <PostToThreadsButton
                            tweets={thread.tweets.map((tw) =>
                              tw.content.replace(/\[AFFILIATE_LINK\]/g, "").trim()
                            )}
                            savedThreadId={thread.metadata.id}
                            accountId={selectedAccountId || undefined}
                            onSaved={() => void refreshAccounts(selectedAccountId)}
                          />
                        )}
                        {activeAccounts.length > 0 && (
                          <SchedulePostDialog
                            tweets={thread.tweets.map((tw) =>
                              tw.content.replace(/\[AFFILIATE_LINK\]/g, "").trim()
                            )}
                            savedThreadId={thread.metadata.id}
                            onScheduled={() => router.refresh()}
                          />
                        )}
                        <Button
                          onClick={() => handleLoadToStudio(thread)}
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] px-3 text-xs font-medium"
                          aria-label={`${t.history.loadToStudio}: ${thread.metadata.topic}`}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                          {t.history.loadToStudio}
                        </Button>

                        <Button
                          onClick={() => handleDownloadSingleTXT(thread)}
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] px-2.5 text-xs font-medium"
                          aria-label={`${t.history.downloadTxt}: ${thread.metadata.topic}`}
                          title={t.history.downloadTxt}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                          TXT
                        </Button>

                        <Button
                          onClick={() => handleDownloadSingleJSON(thread)}
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] px-2.5 text-xs font-medium"
                          aria-label={`${t.history.downloadJson}: ${thread.metadata.topic}`}
                          title={t.history.downloadJson}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                          JSON
                        </Button>

                        <Button
                          onClick={() => handleCopy(thread)}
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] sm:min-w-[44px] px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          aria-label={t.history.copyThreadAria}
                          title={t.history.copyThreadAria}
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">{t.history.copyThreadAria}</span>
                        </Button>

                        <Button
                          ref={(el) => {
                            if (el) {
                              triggerButtonRefs.current.set(thread.metadata.id, el);
                            } else {
                              triggerButtonRefs.current.delete(thread.metadata.id);
                            }
                          }}
                          onClick={() => setThreadToDelete(thread)}
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] sm:min-w-[44px] px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={t.history.deleteThreadAria}
                          title={t.history.deleteThreadAria}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">{t.history.deleteThreadAria}</span>
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeAccounts.length > 0 && (
                        <Badge
                          variant="outline"
                          className={
                            publishedThreadIds.has(thread.metadata.id)
                              ? "text-xs font-normal gap-1 border-success/40 text-success bg-success/5"
                              : "text-xs font-normal gap-1 text-muted-foreground"
                          }
                        >
                          {publishedThreadIds.has(thread.metadata.id) ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              {t.publish.badgePosted}
                            </>
                          ) : (
                            <>
                              <Circle className="h-3 w-3" aria-hidden="true" />
                              {t.publish.badgeNotPosted}
                            </>
                          )}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs font-normal">
                        {thread.metadata.format === "single"
                          ? t.common.singleTweet
                          : t.common.thread}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-normal">
                        {t.options.styles[thread.metadata.style] ||
                          thread.metadata.style}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-normal">
                        {t.options.tones[thread.metadata.tone] ||
                          thread.metadata.tone}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-normal">
                        {t.options.languages[thread.metadata.language] ||
                          thread.metadata.language}
                      </Badge>
                      {thread.metadata.affiliate?.enabled && (
                        <Badge
                          variant="outline"
                          className="text-xs font-normal border-primary/40 text-primary bg-primary/5 gap-1"
                        >
                          <ShoppingBag className="h-3 w-3" />
                          {thread.metadata.affiliate.product?.productName || t.affiliate.toggleTitle}
                        </Badge>
                      )}
                    </div>

                    {thread.tweets && thread.tweets.length > 0 && (
                      <div className="space-y-3">
                        {isExpanded ? (
                          <div className="space-y-2.5 pt-1">
                            {thread.tweets.map((tweet, idx) => (
                              <div
                                key={tweet.id || idx}
                                className="rounded-lg border bg-muted/20 p-3.5 text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal space-y-2"
                              >
                                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                                  <span className="font-semibold">
                                    {String(tweet.order || idx + 1).padStart(2, "0")} / {String(thread.totalTweets).padStart(2, "0")}
                                  </span>
                                  <span>
                                    {tweet.charCount} {t.common.chars}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap">{tweet.content}</p>
                                {tweet.hashtags && tweet.hashtags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {tweet.hashtags.map((tag, tIdx) => (
                                      <Badge
                                        key={tIdx}
                                        variant="secondary"
                                        className="text-[10px] font-mono px-1.5 py-0"
                                      >
                                        #{tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {thread.metadata.affiliate?.enabled &&
                                  thread.metadata.affiliate.product?.productName &&
                                  idx === thread.tweets.length - 1 && (
                                    <div className="mt-2 pt-2 border-t border-border/70 rounded-md bg-background/50 p-2.5 text-xs space-y-1.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="min-w-0 break-words font-semibold text-primary flex items-center gap-1 text-[11px]">
                                          <ShoppingBag className="h-3 w-3 shrink-0" />
                                          {t.affiliate.productLabel} {thread.metadata.affiliate.product.productName}
                                        </span>
                                        {thread.metadata.affiliate.product.price && (
                                          <span className="font-mono text-[11px] text-muted-foreground">
                                            {thread.metadata.affiliate.product.price}
                                          </span>
                                        )}
                                      </div>
                                      <a
                                        href={safeHttpUrl(thread.metadata.affiliate.product.affiliateUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-muted-foreground hover:text-primary hover:underline truncate block font-mono"
                                      >
                                        {thread.metadata.affiliate.product.affiliateUrl}
                                      </a>
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border bg-muted/30 p-3.5 text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                              {t.history.firstTweetPreview}
                            </span>
                            <p className="line-clamp-3 whitespace-pre-wrap">
                              {truncateText(thread.tweets[0]?.content || "", 240)}
                            </p>
                          </div>
                        )}

                        {thread.tweets.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(thread.metadata.id)}
                            className="h-11 sm:h-8 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                                {t.history.hideAllTweets}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                                {t.history.showAllTweets(thread.totalTweets)}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="rounded-xl border bg-card p-8 sm:p-12 text-center text-card-foreground">
                {totalThreads === 0 ? (
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary text-foreground mx-auto flex items-center justify-center">
                      <Library className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold text-foreground">
                        {t.history.noThreadsYet}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {t.history.emptyLibraryDesc}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2.5 pt-1 flex-wrap">
                      <Link href="/generator">
                        <Button className="min-h-[44px] px-4 font-medium">
                          {t.history.createFirstThread}
                        </Button>
                      </Link>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="min-h-[44px] px-4 font-medium"
                      >
                        <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                        {t.history.import}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xl mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary text-foreground mx-auto flex items-center justify-center">
                      <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold text-foreground">
                        {t.history.noThreadsMatch}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {t.history.noMatchDesc(searchQuery)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="min-h-[44px] px-3 text-xs"
                    >
                      {t.history.clearSearch}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => void loadThreads(searchQuery, threads.length)}
                  disabled={isLoadingMore}
                  className="min-h-[44px] px-4 text-sm font-medium"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      {t.common.loading}
                    </>
                  ) : (
                    t.history.loadMore(totalThreads - threads.length)
                  )}
                </Button>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </main>
      <AlertDialog
        open={!!threadToDelete}
        onOpenChange={(open) => {
          if (!open) {
            const targetId = threadToDelete?.metadata.id;
            setThreadToDelete(null);
            if (targetId && triggerButtonRefs.current.has(targetId)) {
              setTimeout(() => {
                triggerButtonRefs.current.get(targetId)?.focus();
              }, 0);
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.history.deleteDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.history.deleteDialogDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}