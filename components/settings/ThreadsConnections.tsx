"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { ThreadsAccountCard } from "./ThreadsAccountCard";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ThreadsAccount {
  id: string;
  username: string;
  token_expires_at: string | null;
  connected_at: string;
}

interface ThreadsConnectionsProps {
  accounts: ThreadsAccount[];
  justConnected?: boolean;
  connectionError?: string;
}

export function ThreadsConnections({
  accounts,
  justConnected,
  connectionError,
}: ThreadsConnectionsProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  // Capture the error once so the banner survives the URL cleanup below.
  const [errorCode] = useState<string | null>(connectionError ?? null);
  const announcedRef = useRef(false);

  useEffect(() => {
    if (justConnected && !announcedRef.current) {
      announcedRef.current = true;
      toast({ title: t.settings.connectedToast });
    }

    // Clear the OAuth result from the URL so a refresh does not repeat it.
    if (justConnected || connectionError) {
      router.replace("/settings");
    }
  }, [justConnected, connectionError, toast, t, router]);

  function handleConnect() {
    setIsConnecting(true);
    window.location.href = "/api/threads/connect";
  }

  const errorMessage = errorCode
    ? errorCode === "denied" || errorCode === "invalid_state"
      ? t.settings.errors[errorCode]
      : t.settings.errors.invalid_state
    : null;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t.settings.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.settings.subtitle}</p>
      </header>

      <section className="space-y-4" aria-labelledby="connections-heading">
        <h2
          id="connections-heading"
          className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground"
        >
          {t.settings.connectionsHeading}
        </h2>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              {t.settings.threadsTitle}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t.settings.threadsDescription}
            </p>
          </div>

          {accounts.length > 0 ? (
            <ul className="space-y-3">
              {accounts.map((account) => (
                <li key={account.id}>
                  <ThreadsAccountCard account={account} locale={locale} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t.settings.noAccounts}
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {t.settings.noAccountsHint}
              </p>
            </div>
          )}

          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            size="lg"
            className="w-full sm:w-auto min-h-[44px]"
          >
            {isConnecting ? t.settings.connecting : t.settings.connectThreads}
          </Button>
        </div>
      </section>
    </div>
  );
}
