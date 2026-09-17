'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WRITING_STYLE_LABELS, WritingStyle } from '@/types/thread';
import { useI18n } from '@/lib/i18n';

interface StyleSelectorProps {
  value: WritingStyle;
  onChange: (value: WritingStyle) => void;
}

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <Label htmlFor="style">{t.composer.writingStyle}</Label>
      <Select value={value} onValueChange={(val) => onChange(val as WritingStyle)}>
        <SelectTrigger id="style">
          <SelectValue placeholder={t.composer.writingStylePlaceholder}>
            {t.options.styles[value] || WRITING_STYLE_LABELS[value]}
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
  );
}
