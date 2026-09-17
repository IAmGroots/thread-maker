"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

interface TopicInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function TopicInput({ value, onChange, error }: TopicInputProps) {
  const { t } = useI18n();
  const describedBy = error ? "topic-error topic-description" : "topic-description";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="topic" className="text-base font-semibold text-foreground">
          {t.composer.topicLabel}
        </Label>
        {value.length > 0 && (
          <span
            className="text-xs text-muted-foreground font-mono tabular-nums"
            aria-label={t.common.charsEntered(value.length)}
          >
            {value.length} {t.common.chars}
          </span>
        )}
      </div>
      <Textarea
        id="topic"
        placeholder={t.composer.topicPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-[130px] resize-none text-base sm:text-sm leading-relaxed ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy}
      />
      {error && (
        <p id="topic-error" className="text-sm text-destructive font-medium" role="alert">
          {error}
        </p>
      )}
      <p id="topic-description" className="text-sm text-muted-foreground">
        {t.composer.topicDescription}
      </p>
    </div>
  );
}
