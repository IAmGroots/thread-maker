"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { ThreadsAccountCard } from "./ThreadsAccountCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CreditCard, Images } from "lucide-react";

interface ThreadsAccount {
  id: string;
  username: string;
  token_expires_at: string | null;
  connected_at: string;
  status?: string;
}

interface WorkspaceInfo {
  name: string;
  plan: string;
  timezone: string;
  role: string;
}

interface ThreadsConnectionsProps {
  accounts: ThreadsAccount[];
  workspace: WorkspaceInfo;
  justConnected?: boolean;
  connectionError?: string;
}

const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Bangkok",
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

export function ThreadsConnections({
  accounts,
  workspace,
  justConnected,
  connectionError,
}: ThreadsConnectionsProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [timezone, setTimezone] = useState(workspace.timezone);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const timezoneOptions = TIMEZONES.includes(workspace.timezone)
    ? TIMEZONES
    : [workspace.timezone, ...TIMEZONES];
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

  async function saveWorkspace(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingWorkspace(true);
    try {
      const response = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t.settings.workspaceSaveFailed);
      }
      toast({ title: t.settings.workspaceSaved });
      router.refresh();
    } catch (error) {
      toast({
        title: t.settings.workspaceSaveFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSavingWorkspace(false);
    }
  }

  const errorMessage = errorCode
    ? errorCode === "denied"
      ? t.settings.errors.denied
      : errorCode === "channel_limit"
        ? t.settings.errors.channel_limit
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

      <section className="space-y-3" aria-labelledby="workspace-heading">
        <h2
          id="workspace-heading"
          className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground"
        >
          {t.settings.workspaceHeading}
        </h2>

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">{t.settings.workspacePlan}</dt>
              <dd className="font-medium text-foreground capitalize">{workspace.plan}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">{t.settings.workspaceTimezone}</dt>
              <dd className="font-mono text-xs text-foreground pt-0.5">{workspace.timezone}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">{t.settings.workspaceRole}</dt>
              <dd className="font-medium text-foreground capitalize">{workspace.role}</dd>
            </div>
          </dl>
          {(workspace.role === "owner" || workspace.role === "admin") && (
            <form
              onSubmit={(event) => void saveWorkspace(event)}
              className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="workspace-name"
                  className="text-xs font-medium text-foreground"
                >
                  {t.settings.workspaceNameLabel}
                </label>
                <Input
                  id="workspace-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  required
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="workspace-timezone"
                  className="text-xs font-medium text-foreground"
                >
                  {t.settings.workspaceTimezoneLabel}
                </label>
                <select
                  id="workspace-timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="w-full min-h-[44px] rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {timezoneOptions.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSavingWorkspace || !name.trim()}
                  className="min-h-[44px]"
                >
                  {isSavingWorkspace
                    ? t.settings.savingWorkspace
                    : t.settings.saveWorkspace}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <p className="text-sm font-medium text-foreground">{workspace.name}</p>
            <Button asChild variant="outline" size="sm" className="min-h-[44px]">
              <Link href="/billing">
                <CreditCard className="h-4 w-4 mr-1.5" aria-hidden="true" />
                {t.settings.managePlan}
              </Link>
            </Button>
          </div>
        </div>
      </section>

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

      <section className="space-y-3" aria-labelledby="media-heading">
        <h2
          id="media-heading"
          className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground"
        >
          {t.media.title}
        </h2>

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t.media.subtitle}</p>
          </div>
          <Button asChild variant="outline" className="min-h-[44px] shrink-0">
            <Link href="/media">
              <Images className="h-4 w-4 mr-1.5" aria-hidden="true" />
              {t.media.manage}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
