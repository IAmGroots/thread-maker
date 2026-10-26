"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, UILocale } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AtSign, Clock, RefreshCw } from "lucide-react";

interface ThreadsAccount {
  id: string;
  username: string;
  token_expires_at: string | null;
  connected_at: string;
  status?: string;
}

export function ThreadsAccountCard({
  account,
  locale,
}: {
  account: ThreadsAccount;
  locale: UILocale;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const expiryLabel = account.token_expires_at
    ? t.settings.tokenExpires(
        new Date(account.token_expires_at).toLocaleDateString(
          locale === "id" ? "id-ID" : "en-US",
          { day: "numeric", month: "short", year: "numeric" },
        ),
      )
    : null;

  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/threads/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });

      if (!response.ok) {
        throw new Error("Disconnect failed");
      }

      setConfirmOpen(false);
      toast({ title: t.settings.disconnectedToast });
      router.refresh();
    } catch {
      toast({
        title: t.settings.disconnectFailed,
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  }

  function handleReconnect() {
    setIsReconnecting(true);
    // Re-run the OAuth flow; the callback upserts the account and stores the
    // token with the app's current (widened) scope set.
    window.location.href = "/api/threads/connect";
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 sm:px-4 py-3">
      <div className="min-w-0 space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground truncate">
          <AtSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          {account.username}
        </p>
        {expiryLabel && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
            {expiryLabel}
          </p>
        )}
        {account.status === "expired" && (
          <p
            role="alert"
            className="text-xs text-destructive"
          >
            {t.publish.accountExpired}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReconnect}
          disabled={isReconnecting || isDisconnecting}
          title={t.settings.reconnectHint}
          className="min-h-[44px]"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1 ${isReconnecting ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {isReconnecting ? t.settings.reconnecting : t.settings.reconnect}
        </Button>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={isReconnecting}
            className="min-h-[44px]"
          >
            {t.settings.disconnect}
          </Button>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.settings.disconnect}</DialogTitle>
              <DialogDescription>
                {t.settings.connectedAs(account.username)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={isDisconnecting}
              >
                {t.common.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? t.settings.disconnecting : t.settings.disconnect}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
