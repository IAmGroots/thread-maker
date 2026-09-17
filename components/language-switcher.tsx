"use client";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t.header.languageSwitch}
      className="inline-flex items-center rounded-md border border-input bg-background p-0.5 text-xs font-medium"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        aria-label="English"
        className={cn(
          "rounded px-2.5 py-1 min-h-[36px] min-w-[34px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          locale === "en"
            ? "bg-secondary text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("id")}
        aria-pressed={locale === "id"}
        aria-label="Bahasa Indonesia"
        className={cn(
          "rounded px-2.5 py-1 min-h-[36px] min-w-[34px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          locale === "id"
            ? "bg-secondary text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        ID
      </button>
    </div>
  );
}
