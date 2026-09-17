"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TONE_LABELS, Tone } from "@/types/thread";
import { useI18n } from "@/lib/i18n";

interface ToneSelectorProps {
  value: Tone;
  onChange: (value: Tone) => void;
}

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <Label htmlFor="tone">{t.composer.tone}</Label>
      <Select value={value} onValueChange={(val) => onChange(val as Tone)}>
        <SelectTrigger id="tone">
          <SelectValue placeholder={t.composer.tonePlaceholder}>
            {t.options.tones[value] || TONE_LABELS[value]}
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
  );
}
