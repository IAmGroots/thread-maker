"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { SavedThread } from "@/types/thread";
import {
  getThreads,
  deleteThread,
  exportToJSON,
  exportToTXT,
  exportSingleThreadToTXT,
  exportSingleThreadToJSON,
  downloadFile,
  parseImportFile,
  importThreads,
  slugifyTopic,
} from "@/lib/storage/localStorage";
import { formatDate, truncateText } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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

export default function HistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const [threads, setThreads] = useState<SavedThread[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredThreads, setFilteredThreads] = useState<SavedThread[]>([]);
  const [threadToDelete, setThreadToDelete] = useState<SavedThread | null>(null);
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set());

  // Focus restoration ref for delete triggers
  const triggerButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const filtered = threads.filter((thread) => {
        const matchesTopic = thread.metadata.topic?.toLowerCase().includes(q);
        const matchesStyle = thread.metadata.style?.toLowerCase().includes(q);
        const matchesTone = thread.metadata.tone?.toLowerCase().includes(q);
        const matchesAffiliate =
          thread.metadata.affiliate?.product?.productName
            ?.toLowerCase()
            .includes(q) ||
          thread.metadata.affiliate?.product?.affiliateUrl
            ?.toLowerCase()
            .includes(q);
        const matchesContent = thread.tweets?.some((tw) =>
          tw.content?.toLowerCase().includes(q)
        );
        return Boolean(
          matchesTopic || matchesStyle || matchesTone || matchesAffiliate || matchesContent
        );
      });
      setFilteredThreads(filtered);
    } else {
      setFilteredThreads(threads);
    }
  }, [searchQuery, threads]);

  const loadThreads = () => {
    const loaded = getThreads();
    // Sort by creation date, newest first
    loaded.sort(
      (a, b) =>
        new Date(b.metadata.createdAt).getTime() -
        new Date(a.metadata.createdAt).getTime()
    );
    setThreads(loaded);
    setFilteredThreads(loaded);
  };

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
    router.push("/");
  };

  const confirmDelete = () => {
    if (!threadToDelete) return;
    const deletedId = threadToDelete.metadata.id;
    const success = deleteThread(deletedId);
    if (success) {
      loadThreads();
      toast({
        title: t.toasts.deleted,
        description: t.toasts.deletedDesc,
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

  const handleExportJSON = () => {
    const json = exportToJSON(filteredThreads);
    downloadFile(json, `threads-${Date.now()}.json`, "application/json");
    toast({
      title: t.toasts.exported,
      description: t.toasts.exportedJsonDesc,
    });
  };

  const handleExportTXT = () => {
    const txt = exportToTXT(filteredThreads);
    downloadFile(txt, `threads-${Date.now()}.txt`, "text/plain");
    toast({
      title: t.toasts.exported,
      description: t.toasts.exportedTxtDesc,
    });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = String(event.target?.result || "");
        const parsedThreads = parseImportFile(content, file.name);

        if (parsedThreads.length > 0) {
          const result = importThreads(parsedThreads);
          loadThreads();
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
      <main className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Masthead & Global Actions */}
          <div className="flex flex-row sm:items-center justify-between gap-4 pb-4 border-b">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t.history.title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t.history.countSaved(threads.length)}
              </p>
            </div>

            {/* Global Import & Export Actions */}
            <div className="flex items-center gap-2 flex-wrap">
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
                className="min-h-[38px] px-3 text-xs font-medium"
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
                    className="min-h-[38px] px-3 text-xs font-medium"
                    aria-label={t.history.exportJson}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    JSON
                  </Button>
                  <Button
                    onClick={handleExportTXT}
                    variant="outline"
                    size="sm"
                    className="min-h-[38px] px-3 text-xs font-medium"
                    aria-label={t.history.exportTxt}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    TXT
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Search Bar */}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* Thread List */}
          <div className="space-y-4">
            {filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => {
                const isExpanded = expandedThreadIds.has(thread.metadata.id);

                return (
                  <article
                    key={thread.metadata.id}
                    className="rounded-xl border bg-card p-5 sm:p-6 text-card-foreground shadow-sm space-y-4 transition-colors hover:border-foreground/20"
                  >
                    {/* Top Header Row: Topic & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        <h2 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                          {thread.metadata.topic}
                        </h2>

                        {/* Metadata row */}
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

                      {/* Actions Toolbar */}
                      <div className="flex items-center gap-1.5 self-start shrink-0 flex-wrap">
                        <Button
                          onClick={() => handleLoadToStudio(thread)}
                          variant="outline"
                          size="sm"
                          className="min-h-[36px] px-3 text-xs font-medium"
                          aria-label={`${t.history.loadToStudio}: ${thread.metadata.topic}`}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                          {t.history.loadToStudio}
                        </Button>

                        <Button
                          onClick={() => handleDownloadSingleTXT(thread)}
                          variant="outline"
                          size="sm"
                          className="min-h-[36px] px-2.5 text-xs font-mono font-medium"
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
                          className="min-h-[36px] px-2.5 text-xs font-mono font-medium"
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
                          className="min-h-[36px] px-2.5 text-xs text-muted-foreground hover:text-foreground"
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
                          className="min-h-[36px] px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={t.history.deleteThreadAria}
                          title={t.history.deleteThreadAria}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">{t.history.deleteThreadAria}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Format & Style Badges */}
                    <div className="flex flex-wrap gap-1.5">
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
                          {thread.metadata.affiliate.product?.productName || "Affiliate"}
                        </Badge>
                      )}
                    </div>

                    {/* Tweet Preview (Collapsed) or Full Tweets (Expanded) */}
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
                                {thread.metadata.affiliate?.enabled &&
                                  thread.metadata.affiliate.product?.productName &&
                                  idx === thread.tweets.length - 1 && (
                                    <div className="mt-2 pt-2 border-t border-border/70 rounded-md bg-background/50 p-2.5 text-xs space-y-1.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-primary flex items-center gap-1 text-[11px]">
                                          <ShoppingBag className="h-3 w-3" />
                                          Produk: {thread.metadata.affiliate.product.productName}
                                        </span>
                                        {thread.metadata.affiliate.product.price && (
                                          <span className="font-mono text-[11px] text-muted-foreground">
                                            {thread.metadata.affiliate.product.price}
                                          </span>
                                        )}
                                      </div>
                                      <a
                                        href={thread.metadata.affiliate.product.affiliateUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-muted-foreground hover:text-primary hover:underline truncate block font-mono"
                                      >
                                        {thread.metadata.affiliate.product.affiliateUrl}
                                      </a>
                                    </div>
                                  )}
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
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground -ml-1"
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
              /* Dual Empty States */
              <div className="rounded-xl border bg-card p-8 sm:p-12 text-center text-card-foreground">
                {threads.length === 0 ? (
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary text-foreground mx-auto flex items-center justify-center">
                      <Library className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold text-foreground">
                        {t.history.noThreadsYet}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Generated threads saved to your local storage will appear here for future reference and editing.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2.5 pt-1 flex-wrap">
                      <Link href="/">
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
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary text-foreground mx-auto flex items-center justify-center">
                      <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold text-foreground">
                        {t.history.noThreadsMatch}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        No thread matched &ldquo;{searchQuery}&rdquo;. Try another keyword or clear the search query.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="min-h-[38px] px-3 text-xs"
                    >
                      {t.history.clearSearch}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Alert Dialog */}
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
