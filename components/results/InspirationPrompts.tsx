"use client";

import { PenLine, Code2, TrendingUp, Compass, GraduationCap } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface InspirationPromptsProps {
  onSelectPrompt: (topic: string) => void;
}

const PROMPT_ICONS = [Code2, TrendingUp, Compass, GraduationCap];

export function InspirationPrompts({ onSelectPrompt }: InspirationPromptsProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <div className="flex items-start gap-4 mb-6">
        <div className="rounded-lg bg-secondary p-2.5 text-foreground">
          <PenLine className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t.prompts.heading}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.prompts.description}
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t.prompts.suggestedTopics}
        </p>
        <div className="grid grid-cols-1 gap-3">
          {t.prompts.items.map((prompt, index) => {
            const Icon = PROMPT_ICONS[index % PROMPT_ICONS.length] || PenLine;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectPrompt(prompt.topic)}
                className="group flex w-full items-start gap-3 rounded-lg border bg-background p-3.5 text-left transition-colors hover:bg-secondary/60 hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="text-muted-foreground transition-colors group-hover:text-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="inline-block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {prompt.category}
                  </span>
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {prompt.topic}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
