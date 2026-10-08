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
import { AtSign, Clock } from "lucide-react";

interface ThreadsAccount {
  id: string;
  username: string;
  token_expires_at: string | null;
  connected_at: string;
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

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 sm:px-4 py-3">
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
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          className="shrink-0 min-h-[44px]"
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
  );
}
