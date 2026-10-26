"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2, AlertCircle, ExternalLink, Settings } from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import { pollTargetStatus } from "@/lib/client/poll-target";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useThreadsAccounts } from "@/hooks/use-threads-accounts";
import { countThreadsChars } from "@/lib/utils";
import { MAX_CHAIN_LENGTH, MAX_POST_CHARS } from "@/lib/threads/limits";

interface PostToThreadsButtonProps {
  tweets: string[];
  savedThreadId?: string;
  /** Drives the per-account "already posted" badge. */
  accountId?: string;
  /** Persist the thread before publishing and return its id. */
  onBeforePublish?: () => Promise<string | undefined>;
  onSaved?: () => void;
  disabled?: boolean;
  className?: string;
}

interface PublishResponse {
  success: boolean;
  status: "publishing" | "published" | "partial_published" | "failed";
  targetId?: string;
  publishedCount: number;
  total: number;
  failedAtIndex: number | null;
  primaryPostId: string | null;
  postUrl?: string | null;
  username: string;
  error?: string;
}

interface TargetStatusResponse extends PublishResponse {
  done?: boolean;
}

export function PostToThreadsButton({
  tweets,
  savedThreadId,
  accountId,
  onBeforePublish,
  onSaved,
  disabled = false,
  className,
}: PostToThreadsButtonProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const { accounts, publishedThreadIds, isLoading: accountsLoading } =
    useThreadsAccounts(accountId);
  const activeAccounts = useMemo(
    () => accounts.filter((account) => (account.status ?? "active") === "active"),
    [accounts],
  );

  const [open, setOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedMediaId, setSelectedMediaId] = useState<string>("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // One id per dialog session: retrying the same publish dedupes server-side.
  const [requestId, setRequestId] = useState<string>("");

  useEffect(() => {
    if (!selectedAccountId && activeAccounts.length > 0) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

  const tooLongIndex = useMemo(
    () => tweets.findIndex((tw) => countThreadsChars(tw) > MAX_POST_CHARS),
    [tweets],
  );
  const tooMany = tweets.length > MAX_CHAIN_LENGTH;

  const alreadyPosted =
    savedThreadId != null && publishedThreadIds.has(savedThreadId);

  // Not connected: show a link to settings instead of a dead button (R-26).
  if (!accountsLoading && activeAccounts.length === 0) {
    return (
      <Button
        asChild
        variant="outline"
        className={`min-h-[44px] px-3 text-xs sm:text-sm gap-1.5 ${className ?? ""}`}
      >
        <Link href="/settings">
          <Settings className="h-4 w-4" aria-hidden="true" />
          {t.publish.connectFirst}
        </Link>
      </Button>
    );
  }

  function reportOutcome(data: PublishResponse) {
    if (data.status === "published") {
      toast({
        title: t.publish.publishedAll,
        description: t.publish.publishedAllDesc(data.username),
        action: data.primaryPostId
          ? (
            <a
              href={
                data.postUrl ??
                `https://www.threads.net/@${data.username}/post/${data.primaryPostId}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium underline"
            >
              {t.publish.viewPost}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )
          : undefined,
      });
      return;
    }

    const isPermission =
      typeof data.error === "string" &&
      data.error.toLowerCase().includes("permission");

    if (data.status === "partial_published") {
      toast({
        title: t.publish.publishedPartial(data.publishedCount, data.total),
        description: isPermission
          ? t.publish.permissionDeniedDesc
          : t.publish.publishedPartialDesc(
              (data.failedAtIndex ?? 0) + 1,
              data.error ?? "",
            ),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isPermission ? t.publish.permissionDenied : t.publish.publishFailed,
      description: isPermission ? t.publish.permissionDeniedDesc : data.error,
      variant: "destructive",
    });
  }

  /** Follow a queued target until the worker finishes or the wait runs out. */
  async function pollTarget(
    targetId: string,
    total: number,
  ): Promise<TargetStatusResponse | null> {
    const final = await pollTargetStatus(targetId, {
      onProgress: (payload) => {
        setProgress({
          done: payload.publishedCount ?? 0,
          total: payload.total ?? total,
        });
      },
    });

    return final as TargetStatusResponse | null;
  }

  async function handlePublish() {
    if (!selectedAccountId) return;
    setIsPublishing(true);
    setProgress({ done: 0, total: tweets.length });

    try {
      // The publish log references a saved thread, so persist it first.
      const threadId = savedThreadId ?? (await onBeforePublish?.());
      if (onBeforePublish && !threadId) {
        throw new Error(t.publish.saveBeforePublishFailed);
      }

      const response = await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          savedThreadId: threadId,
          tweets,
          mediaId: selectedMediaId || undefined,
          requestId: requestId || undefined,
        }),
      });
      const data = (await response.json()) as PublishResponse;

      if (!response.ok) {
        throw new Error(data.error || t.publish.publishFailed);
      }

      onSaved?.();

      // Already finished (duplicate request) or still queued.
      if (data.status !== "publishing" || !data.targetId) {
        setOpen(false);
        reportOutcome(data);
        return;
      }

      const final = await pollTarget(data.targetId, data.total);

      if (!final) {
        setOpen(false);
        toast({
          title: t.publish.stillPublishing,
          description: t.publish.stillPublishingDesc,
          action: (
            <Link href="/queue" className="text-xs font-medium underline">
              {t.publish.openQueue}
            </Link>
          ),
        });
        return;
      }

      setOpen(false);
      reportOutcome({ ...final, username: data.username });
    } catch (error) {
      toast({
        title: t.publish.publishFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
      setProgress(null);
    }
  }

  const progressLabel = progress
    ? t.publish.publishingProgress(Math.min(progress.done + 1, progress.total), progress.total)
    : t.publish.publishing;

  return (
    <>
      <Button
        onClick={() => {
          setRequestId(crypto.randomUUID());
          setSelectedMediaId("");
          setProgress(null);
          setOpen(true);
        }}
        disabled={disabled || accountsLoading}
        className={`min-h-[44px] px-4 text-xs sm:text-sm font-medium ${className ?? ""}`}
      >
        <Send className="h-4 w-4 mr-1" aria-hidden="true" />
        {t.publish.postToThreads}
      </Button>

      <Dialog open={open} onOpenChange={(next) => !isPublishing && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.publish.dialogTitle}</DialogTitle>
            <DialogDescription>
              {t.publish.dialogDescription(tweets.length)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="publish-account"
                className="text-xs font-medium text-foreground"
              >
                {t.publish.selectAccount}
              </label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                disabled={isPublishing}
              >
                <SelectTrigger id="publish-account" className="min-h-[44px]">
                  <SelectValue placeholder={t.publish.noAccount} />
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

            <MediaPicker
              idPrefix="publish-media"
              value={selectedMediaId}
              onChange={setSelectedMediaId}
              enabled={open}
              disabled={isPublishing}
            />

            {tooMany && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{`A thread cannot exceed ${MAX_CHAIN_LENGTH} posts.`}</span>
              </div>
            )}

            {tooLongIndex !== -1 && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{t.publish.tooLongWarning(tooLongIndex + 1)}</span>
              </div>
            )}

            {alreadyPosted && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{t.publish.alreadyPostedWarning()}</span>
              </div>
            )}

            {isPublishing && (
              <p
                role="status"
                aria-live="polite"
                className="text-xs text-muted-foreground"
              >
                {progressLabel}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPublishing}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing || !selectedAccountId || tooMany || tooLongIndex !== -1}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                  {t.publish.publishing}
                </>
              ) : (
                t.publish.publishNow
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
