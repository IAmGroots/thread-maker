"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tweet, AffiliateProduct } from "@/types/thread";
import { Copy, Edit2, RefreshCw, Save, SlidersHorizontal, ShoppingBag, Link as LinkIcon, Check, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { countTwitterChars, cn, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TweetCardProps {
  tweet: Tweet;
  index: number;
  total: number;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
  onCopy?: () => void;
  onAdjustLength?: () => void;
  isEditing?: boolean;
  affiliateUrl?: string;
  isAffiliateTweet?: boolean;
  affiliateProduct?: AffiliateProduct;
}

export function TweetCard({
  tweet,
  index,
  total,
  onEdit,
  onRegenerate,
  onCopy,
  onAdjustLength,
  isEditing: externalIsEditing,
  affiliateUrl,
  isAffiliateTweet,
  affiliateProduct,
}: TweetCardProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(tweet.content);
  const [copiedLink, setCopiedLink] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const editing = externalIsEditing ?? isEditing;
  const targetAffiliateUrl = affiliateProduct?.affiliateUrl || affiliateUrl;

  const handleCopyAffiliateLink = async () => {
    if (!targetAffiliateUrl) return;
    const success = await copyToClipboard(targetAffiliateUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({
        title: "Link Afiliasi Disalin",
        description: targetAffiliateUrl,
      });
    }
  };

  // Keep local editContent in sync when tweet.content updates externally (e.g. from regenerate or adjust-length)
  useEffect(() => {
    setEditContent(tweet.content);
  }, [tweet.content]);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length || 0;
      textareaRef.current?.setSelectionRange(len, len);
    }
  }, [editing]);

  const handleSave = () => {
    if (onEdit) {
      onEdit(editContent);
      setIsEditing(false);
      setTimeout(() => {
        editButtonRef.current?.focus();
      }, 0);
    }
  };

  const handleCancel = () => {
    setEditContent(tweet.content);
    setIsEditing(false);
    setTimeout(() => {
      editButtonRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const currentCharCount = editing
    ? countTwitterChars(editContent)
    : countTwitterChars(tweet.content);

  const formattedOrder = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  return (
    <article className="rounded-xl border bg-card p-4 sm:p-5 text-card-foreground shadow-sm space-y-3.5 transition-colors">
      {/* Top Header Row: Order (left) & Actions (right) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs font-semibold tabular-nums text-muted-foreground tracking-wider"
            aria-label={t.results.tweetOrderAria(index + 1, total)}
          >
            {formattedOrder}
          </span>
          {isAffiliateTweet && (
            <Badge
              variant="outline"
              className="text-[10px] font-medium py-0 px-1.5 border-primary/40 text-primary bg-primary/5 gap-1"
            >
              <ShoppingBag className="h-3 w-3" />
              Link Produk
            </Badge>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1">
            {affiliateUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyAffiliateLink}
                className="h-8 px-2 sm:px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
                aria-label="Salin Link Afiliasi"
              >
                {copiedLink ? (
                  <Check className="h-3.5 w-3.5 sm:mr-1.5 text-green-500" aria-hidden="true" />
                ) : (
                  <LinkIcon className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {copiedLink ? "Disalin" : "Salin Link"}
                </span>
              </Button>
            )}
            {onEdit && (
              <Button
                ref={editButtonRef}
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground"
                aria-label={t.results.editAria(index + 1)}
              >
                <Edit2 className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t.common.edit}</span>
              </Button>
            )}
            {onRegenerate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRegenerate}
                className="h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground"
                aria-label={t.results.regenAria(index + 1)}
              >
                <RefreshCw
                  className="h-3.5 w-3.5 sm:mr-1.5"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">{t.common.regen}</span>
              </Button>
            )}
            {onAdjustLength && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onAdjustLength}
                className="h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground"
                aria-label={t.results.adjustLengthAria(index + 1)}
              >
                <SlidersHorizontal
                  className="h-3.5 w-3.5 sm:mr-1.5"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">
                  {t.adjustLength.dialogTitle}
                </span>
              </Button>
            )}
            {onCopy && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onCopy}
                className="h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground"
                aria-label={t.results.copyAria(index + 1)}
              >
                <Copy className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t.common.copy}</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tweet Body or Inline Editor */}
      {editing ? (
        <div className="space-y-3">
          <Textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label={t.results.editTweetAria(index + 1)}
            className="min-h-[120px] resize-none text-base sm:text-sm leading-relaxed focus-visible:ring-primary"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                aria-label={t.results.saveTweetAria(index + 1)}
                className="h-8 px-3 text-xs font-medium"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                {t.common.save}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                aria-label={t.results.cancelTweetAria(index + 1)}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                {t.common.cancel}
              </Button>
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground tracking-wider">
              {currentCharCount} {t.common.chars}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap text-foreground font-normal">
          {tweet.content}
        </div>
      )}

      {/* Bottom Meter Row: Hashtags (left) & Monospace Character Meter (right) */}
      {!editing && (
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
          <div className="flex flex-wrap gap-1.5">
            {tweet.hashtags && tweet.hashtags.length > 0 ? (
              tweet.hashtags.map((tag, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[11px] font-mono font-normal px-2 py-0.5 rounded"
                >
                  #{tag}
                </Badge>
              ))
            ) : (
              <span />
            )}
          </div>

          <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground tracking-wider">
            {currentCharCount} {t.common.chars}
          </span>
        </div>
      )}

      {isAffiliateTweet && affiliateProduct && affiliateProduct.productName && (
        <div className="mt-3 pt-3 border-t border-border/70 rounded-lg bg-muted/40 p-3 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Produk yang Disebut</span>
            </div>
            {affiliateProduct.price && (
              <span className="text-xs font-mono font-medium text-muted-foreground bg-background px-2 py-0.5 rounded border">
                {affiliateProduct.price}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {affiliateProduct.productName}
              </p>
              {targetAffiliateUrl && (
                <a
                  href={targetAffiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary hover:underline truncate block font-mono mt-0.5"
                >
                  {targetAffiliateUrl}
                </a>
              )}
            </div>

            {targetAffiliateUrl && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyAffiliateLink}
                  className="h-8 px-2.5 text-xs font-medium gap-1.5"
                >
                  {copiedLink ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedLink ? "Tersalin" : "Salin Link"}</span>
                </Button>
                <a
                  href={targetAffiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka Link</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
