"use client";

import { TweetCard } from "./TweetCard";
import { TweetActions } from "./TweetActions";
import { ThreadConnectorLine } from "./ThreadConnectorLine";
import { GeneratedThread } from "@/types/thread";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { ShoppingBag } from "lucide-react";

interface ThreadPreviewProps {
  thread: GeneratedThread;
  onEditTweet?: (tweetIndex: number, newContent: string) => void;
  onRegenerateTweet?: (tweetIndex: number) => void;
  onRegenerateAll?: () => void;
  onSave?: () => void;
  onTransform?: () => void;
  onAdjustLength?: () => void;
  onAdjustLengthTweet?: (tweetIndex: number) => void;
  onExport?: () => void;
  isLoading?: boolean;
}

export function ThreadPreview({
  thread,
  onEditTweet,
  onRegenerateTweet,
  onRegenerateAll,
  onSave,
  onTransform,
  onAdjustLength,
  onAdjustLengthTweet,
  onExport,
  isLoading = false,
}: ThreadPreviewProps) {
  const { toast } = useToast();
  const { t } = useI18n();

  const handleCopyAll = async () => {
    const formattedThread = thread.tweets
      .map(
        (tweet) =>
          `${tweet.order}/${thread.totalTweets}\n\n${tweet.content.replace(/\[AFFILIATE_LINK\]/g, "").trim()}`,
      )
      .join("\n\n---\n\n");

    const success = await copyToClipboard(formattedThread);

    if (success) {
      toast({
        title: t.toasts.copied,
        description: t.toasts.threadCopiedDesc,
      });
    } else {
      toast({
        title: t.toasts.copyFailed,
        description: t.toasts.copyFailedDesc,
        variant: "destructive",
      });
    }
  };

  const handleCopySingle = async (tweet: (typeof thread.tweets)[0]) => {
    const success = await copyToClipboard(tweet.content);

    if (success) {
      toast({
        title: t.toasts.copied,
        description: t.toasts.singleTweetCopiedDesc(tweet.order),
      });
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-5 text-card-foreground shadow-sm">
      {/* Thread Metadata Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            {t.results.generatedThread}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono tabular-nums mt-0.5">
            {t.results.summary(thread.totalTweets, thread.totalChars)}
          </p>
        </div>

        {thread.metadata?.affiliate?.enabled && thread.metadata?.affiliate?.product?.productName && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-xs self-start sm:self-auto">
            <ShoppingBag className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground">Produk:</span>
            <span className="font-medium text-foreground truncate max-w-[200px]">
              {thread.metadata.affiliate.product.productName}
            </span>
            {thread.metadata.affiliate.product.price && (
              <span className="text-muted-foreground font-mono text-[11px]">
                • {thread.metadata.affiliate.product.price}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tweet Cards with Thread Connector Line */}
      <div className="space-y-0">
        {thread.tweets.map((tweet, index) => {
          const isAffiliateEnabled = Boolean(thread.metadata?.affiliate?.enabled);
          const affiliateProd = thread.metadata?.affiliate?.product;
          const isLastTweet = index === thread.tweets.length - 1;
          const containsAffiliateUrl = Boolean(
            affiliateProd?.affiliateUrl && tweet.content.includes(affiliateProd.affiliateUrl)
          );
          const isAffiliateTweet = isAffiliateEnabled && (isLastTweet || containsAffiliateUrl);

          return (
            <div key={tweet.id || index}>
              <TweetCard
                tweet={tweet}
                index={index}
                total={thread.totalTweets}
                onEdit={
                  onEditTweet ? (content) => onEditTweet(index, content) : undefined
                }
                onRegenerate={
                  onRegenerateTweet ? () => onRegenerateTweet(index) : undefined
                }
                onCopy={() => handleCopySingle(tweet)}
                onAdjustLength={
                  onAdjustLengthTweet
                    ? () => onAdjustLengthTweet(index)
                    : undefined
                }
                affiliateUrl={isAffiliateTweet ? affiliateProd?.affiliateUrl : undefined}
                isAffiliateTweet={isAffiliateTweet}
                affiliateProduct={isAffiliateTweet ? affiliateProd : undefined}
              />
              {index < thread.tweets.length - 1 && <ThreadConnectorLine />}
            </div>
          );
        })}
      </div>

      {/* Actions Toolbar */}
      <TweetActions
        onRegenerateAll={onRegenerateAll}
        onSave={onSave}
        onTransform={onTransform}
        // onAdjustLength={onAdjustLength}
        onExport={onExport}
        onCopyAll={handleCopyAll}
        isLoading={isLoading}
      />
    </div>
  );
}
