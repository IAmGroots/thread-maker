"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CalendarClock, Loader2, AlertCircle } from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useThreadsAccounts } from "@/hooks/use-threads-accounts";
import { countThreadsChars } from "@/lib/utils";
import { MAX_CHAIN_LENGTH, MAX_POST_CHARS } from "@/lib/threads/limits";

interface SchedulePostDialogProps {
  tweets: string[];
  savedThreadId?: string;
  onScheduled?: () => void;
}

/** Converts a Date to the value format required by <input type="datetime-local">. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function SchedulePostDialog({
  tweets,
  savedThreadId,
  onScheduled,
}: SchedulePostDialogProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { accounts } = useThreadsAccounts();
  const activeAccounts = useMemo(
    () => accounts.filter((account) => (account.status ?? "active") === "active"),
    [accounts],
  );

  const [open, setOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [when, setWhen] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState("");

  useEffect(() => {
    if (!selectedAccountId && activeAccounts.length > 0) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

  useEffect(() => {
    if (open && !when) {
      // Default to one hour from now.
      setWhen(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
    }
  }, [open, when]);

  const tooLongIndex = useMemo(
    () => tweets.findIndex((tw) => countThreadsChars(tw) > MAX_POST_CHARS),
    [tweets],
  );
  const tooMany = tweets.length > MAX_CHAIN_LENGTH;

  const whenInvalid = useMemo(() => {
    if (!when) return true;
    const time = new Date(when).getTime();
    return Number.isNaN(time) || time <= Date.now();
  }, [when]);

  async function handleSchedule() {
    if (!selectedAccountId || whenInvalid) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/threads/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          savedThreadId,
          tweets,
          scheduledFor: new Date(when).toISOString(),
          mediaId: selectedMediaId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.schedule.scheduleFailed);
      }

      setOpen(false);
      const label = new Date(when).toLocaleString(locale === "id" ? "id-ID" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      toast({
        title: t.schedule.scheduledToast,
        description: t.schedule.scheduledToastDesc(label),
      });
      onScheduled?.();
    } catch (error) {
      toast({
        title: t.schedule.scheduleFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const disabled = isSubmitting || !selectedAccountId || whenInvalid || tooMany || tooLongIndex !== -1;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        disabled={activeAccounts.length === 0}
        className="min-h-[44px] px-3 text-xs font-medium"
      >
        <CalendarClock className="h-4 w-4 mr-1" aria-hidden="true" />
        {t.schedule.scheduleAction}
      </Button>

      <Dialog open={open} onOpenChange={(next) => !isSubmitting && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.schedule.dialogTitle}</DialogTitle>
            <DialogDescription>
              {t.schedule.dialogDescription(tweets.length)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="schedule-account" className="text-xs font-medium text-foreground">
                {t.publish.selectAccount}
              </label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                disabled={isSubmitting}
              >
                <SelectTrigger id="schedule-account" className="min-h-[44px]">
                  <SelectValue placeholder={t.publish.noAccount} />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="schedule-when" className="text-xs font-medium text-foreground">
                {t.schedule.whenLabel}
              </label>
              <Input
                id="schedule-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                disabled={isSubmitting}
                className="min-h-[44px]"
                aria-describedby="schedule-when-hint"
              />
              <p id="schedule-when-hint" className="text-xs text-muted-foreground">
                {t.schedule.timeHint}
              </p>
            </div>

            <MediaPicker
              idPrefix="schedule-media"
              value={selectedMediaId}
              onChange={setSelectedMediaId}
              enabled={open}
              disabled={isSubmitting}
            />

            {when !== "" && whenInvalid && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{t.schedule.futureRequired}</span>
              </div>
            )}

            {(tooMany || tooLongIndex !== -1) && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  {tooMany
                    ? `A thread cannot exceed ${MAX_CHAIN_LENGTH} posts.`
                    : t.publish.tooLongWarning(tooLongIndex + 1)}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSchedule} disabled={disabled}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                  {t.schedule.scheduling}
                </>
              ) : (
                t.schedule.confirmSchedule
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
