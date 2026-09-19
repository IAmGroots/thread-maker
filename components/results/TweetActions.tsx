"use client";

import { Button } from "@/components/ui/button";
import {
  Copy,
  RefreshCw,
  Save,
  Download,
  Wand2,
  SlidersHorizontal,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface TweetActionsProps {
  onCopyAll?: () => void;
  onRegenerateAll?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onTransform?: () => void;
  onAdjustLength?: () => void;
  isLoading?: boolean;
}

export function TweetActions({
  onCopyAll,
  onRegenerateAll,
  onSave,
  onExport,
  onTransform,
  onAdjustLength,
  isLoading = false,
}: TweetActionsProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-border/60">
      {/* Primary and Secondary Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {onSave && (
          <Button
            onClick={onSave}
            disabled={isLoading}
            className="min-h-[44px] px-4 text-xs sm:text-sm font-medium"
          >
            <Save className="h-4 w-4 mr-1" aria-hidden="true" />
            {t.results.save}
          </Button>
        )}

        {onTransform && (
          <Button
            onClick={onTransform}
            disabled={isLoading}
            variant="outline"
            className="min-h-[44px] px-3 text-xs sm:text-sm"
          >
            <Wand2 className="h-4 w-4 mr-1" aria-hidden="true" />
            {t.results.transform}
          </Button>
        )}

        {onAdjustLength && (
          <Button
            onClick={onAdjustLength}
            disabled={isLoading}
            variant="outline"
            className="min-h-[44px] px-3 text-xs sm:text-sm"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" aria-hidden="true" />
            {t.adjustLength.dialogTitle}
          </Button>
        )}

        {onRegenerateAll && (
          <Button
            onClick={onRegenerateAll}
            disabled={isLoading}
            variant="outline"
            className="min-h-[44px] px-3 text-xs sm:text-sm"
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")}
              aria-hidden="true"
            />
            {t.results.regenerate}
          </Button>
        )}
      </div>

      {/* Tertiary Utilities */}
      <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
        {onCopyAll && (
          <Button
            onClick={onCopyAll}
            disabled={isLoading}
            variant="ghost"
            className="min-h-[44px] px-3 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
            {t.results.copyAll}
          </Button>
        )}

        {onExport && (
          <Button
            onClick={onExport}
            disabled={isLoading}
            variant="ghost"
            className="min-h-[44px] px-3 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
          >
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />
            {t.results.export}
          </Button>
        )}
      </div>
    </div>
  );
}
