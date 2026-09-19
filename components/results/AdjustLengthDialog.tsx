"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tweet } from "@/types/thread";
import { useI18n } from "@/lib/i18n";
import { cn, truncateText } from "@/lib/utils";
import { Loader2, Minimize2, Maximize2 } from "lucide-react";

interface AdjustLengthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tweets: Tweet[];
  initialTweetIndex?: number;
  onApply: (tweetIndex: number, direction: "shorten" | "lengthen") => Promise<void>;
  isLoading?: boolean;
}

export function AdjustLengthDialog({
  open,
  onOpenChange,
  tweets,
  initialTweetIndex = 0,
  onApply,
  isLoading = false,
}: AdjustLengthDialogProps) {
  const { t } = useI18n();
  const [tweetIndex, setTweetIndex] = useState<number>(initialTweetIndex);
  const [direction, setDirection] = useState<"shorten" | "lengthen">("shorten");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTweetIndex(initialTweetIndex < tweets.length ? initialTweetIndex : 0);
      setDirection("shorten");
      setError(null);
    }
  }, [open, initialTweetIndex, tweets.length]);

  const currentSelectedTweet = tweets[tweetIndex] || tweets[0];

  const handleSubmit = async () => {
    setError(null);
    try {
      await onApply(tweetIndex, direction);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.toasts.adjustLengthFailed
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={isLoading ? () => {} : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minimize2 className="h-4 w-4 text-foreground" aria-hidden="true" />
            {t.adjustLength.dialogTitle}
          </DialogTitle>
          <DialogDescription>{t.adjustLength.dialogDesc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive font-medium"
            >
              {error}
            </div>
          )}

          {/* Select which tweet if thread has more than 1 tweet */}
          {tweets.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="adjust-tweet-select">
                {t.adjustLength.selectTweet}
              </Label>
              <Select
                value={String(tweetIndex)}
                onValueChange={(val) => setTweetIndex(Number(val))}
                disabled={isLoading}
              >
                <SelectTrigger id="adjust-tweet-select" className="min-h-[44px]">
                  <SelectValue>
                    {t.adjustLength.selectTweetLabel(tweetIndex)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tweets.map((tw, idx) => (
                    <SelectItem key={tw.id || idx} value={String(idx)}>
                      {t.adjustLength.selectTweetLabel(idx)}:{" "}
                      {truncateText(tw.content, 40)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview of target tweet snippet */}
          {currentSelectedTweet && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground font-mono block mb-1">
                {t.adjustLength.selectTweetLabel(tweetIndex)} ({currentSelectedTweet.charCount} / 280)
              </span>
              <p className="line-clamp-2 text-foreground/90">
                {currentSelectedTweet.content}
              </p>
            </div>
          )}

          {/* Direction options */}
          <div className="space-y-2">
            <Label>{t.adjustLength.direction}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup">
              <button
                type="button"
                role="radio"
                aria-checked={direction === "shorten"}
                onClick={() => setDirection("shorten")}
                disabled={isLoading}
                className={cn(
                  "flex flex-col items-start rounded-lg border p-3 text-left transition-all min-h-[44px]",
                  direction === "shorten"
                    ? "border-primary bg-secondary/80 ring-1 ring-primary"
                    : "border-input bg-card hover:bg-secondary/40"
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground mb-1">
                  <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.adjustLength.shorten}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t.adjustLength.shortenDesc}
                </p>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={direction === "lengthen"}
                onClick={() => setDirection("lengthen")}
                disabled={isLoading}
                className={cn(
                  "flex flex-col items-start rounded-lg border p-3 text-left transition-all min-h-[44px]",
                  direction === "lengthen"
                    ? "border-primary bg-secondary/80 ring-1 ring-primary"
                    : "border-input bg-card hover:bg-secondary/40"
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground mb-1">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.adjustLength.lengthen}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t.adjustLength.lengthenDesc}
                </p>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="min-h-[44px]"
          >
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="min-h-[44px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                {t.adjustLength.processing}
              </>
            ) : (
              t.adjustLength.apply
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
