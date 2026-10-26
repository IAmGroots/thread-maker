"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">{t.error.title}</h1>
        <p className="text-sm text-muted-foreground">{t.error.description}</p>
        <Button onClick={reset} className="min-h-[44px]">
          {t.error.retry}
        </Button>
      </div>
    </main>
  );
}
