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
import {
  WritingStyle,
  Tone,
  WRITING_STYLE_LABELS,
  TONE_LABELS,
} from "@/types/thread";
import { useI18n } from "@/lib/i18n";
import { Loader2, Wand2 } from "lucide-react";

interface TransformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStyle: WritingStyle;
  currentTone: Tone;
  onTransform: (newStyle: WritingStyle, newTone: Tone) => Promise<void>;
  isLoading?: boolean;
}

export function TransformDialog({
  open,
  onOpenChange,
  currentStyle,
  currentTone,
  onTransform,
  isLoading = false,
}: TransformDialogProps) {
  const { t } = useI18n();
  const [selectedStyle, setSelectedStyle] = useState<WritingStyle>(currentStyle);
  const [selectedTone, setSelectedTone] = useState<Tone>(currentTone);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedStyle(currentStyle);
      setSelectedTone(currentTone);
      setError(null);
    }
  }, [open, currentStyle, currentTone]);

  const handleApply = async () => {
    setError(null);
    try {
      await onTransform(selectedStyle, selectedTone);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.toasts.transformFailed
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={isLoading ? () => {} : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-foreground" aria-hidden="true" />
            {t.transform.dialogTitle}
          </DialogTitle>
          <DialogDescription>{t.transform.dialogDesc}</DialogDescription>
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

          <div className="space-y-2">
            <Label htmlFor="transform-style">{t.transform.targetStyle}</Label>
            <Select
              value={selectedStyle}
              onValueChange={(val) => setSelectedStyle(val as WritingStyle)}
              disabled={isLoading}
            >
              <SelectTrigger id="transform-style" className="min-h-[40px]">
                <SelectValue>
                  {t.options.styles[selectedStyle] ||
                    WRITING_STYLE_LABELS[selectedStyle]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WRITING_STYLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {t.options.styles[key] || label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transform-tone">{t.transform.targetTone}</Label>
            <Select
              value={selectedTone}
              onValueChange={(val) => setSelectedTone(val as Tone)}
              disabled={isLoading}
            >
              <SelectTrigger id="transform-tone" className="min-h-[40px]">
                <SelectValue>
                  {t.options.tones[selectedTone] || TONE_LABELS[selectedTone]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TONE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {t.options.tones[key] || label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="min-h-[40px]"
          >
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={isLoading}
            className="min-h-[40px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                {t.transform.processing}
              </>
            ) : (
              t.transform.apply
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
