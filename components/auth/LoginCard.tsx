"use client";

import { useI18n } from "@/lib/i18n";
import { LoginButton } from "./LoginButton";
import { AlertCircle } from "lucide-react";

export function LoginCard({ authError }: { authError?: boolean }) {
  const { t } = useI18n();

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t.auth.signInHeading}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.auth.signInDescription}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        {authError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{t.auth.authFailed}</span>
          </div>
        )}
        <LoginButton />
      </div>
    </div>
  );
}
