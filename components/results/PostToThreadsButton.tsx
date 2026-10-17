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
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useThreadsAccounts } from "@/hooks/use-threads-accounts";
import { countTwitterChars } from "@/lib/utils";

const MAX_POST_CHARS = 500;
const MAX_CHAIN_LENGTH = 15;

interface PostToThreadsButtonProps {
  tweets: string[];
  savedThreadId?: string;
  onSaved?: () => void;
  disabled?: boolean;
  className?: string;
}

interface PublishResponse {
  success: boolean;
  status: "published" | "partial_published" | "failed";
  publishedCount: number;
  total: number;
  failedAtIndex: number | null;
  primaryPostId: string | null;
  username: string;
  error?: string;
}

export function PostToThreadsButton({
  tweets,
  savedThreadId,
  onSaved,
  disabled = false,
  className,
}: PostToThreadsButtonProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const { accounts, publishedThreadIds, isLoading: accountsLoading } = useThreadsAccounts();
  const [open, setOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const tooLongIndex = useMemo(
    () => tweets.findIndex((tw) => countTwitterChars(tw) > MAX_POST_CHARS),
    [tweets],
  );
  const tooMany = tweets.length > MAX_CHAIN_LENGTH;

  const alreadyPosted =
    savedThreadId != null && publishedThreadIds.has(savedThreadId);

  // Not connected: show a link to settings instead of a dead button (R-26).
  if (!accountsLoading && accounts.length === 0) {
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

  async function handlePublish() {
    if (!selectedAccountId) return;
    setIsPublishing(true);
    try {
      const response = await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          savedThreadId,
          tweets,
        }),
      });
      const data: PublishResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.publish.publishFailed);
      }

      setOpen(false);
      onSaved?.();

      if (data.status === "published") {
        toast({
          title: t.publish.publishedAll,
          description: t.publish.publishedAllDesc(data.username),
          action: data.primaryPostId
            ? (
              <a
                href={`https://www.threads.net/@${data.username}/post/${data.primaryPostId}`}
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
      } else if (data.status === "partial_published") {
        toast({
          title: t.publish.publishedPartial(data.publishedCount, data.total),
          description: t.publish.publishedPartialDesc(
            (data.failedAtIndex ?? 0) + 1,
            data.error ?? "",
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: t.publish.publishFailed,
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t.publish.publishFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
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
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
