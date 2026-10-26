"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/header";
import { PaymentDetails } from "@/components/billing/PaymentDetails";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { formatBytes } from "@/lib/utils";

type PlanId = "free" | "starter" | "creator" | "pro";

interface PlanLimits {
  channels: number;
  scheduledPostsPerMonth: number;
  aiCreditsPerMonth: number;
  mediaBytes: number;
  analyticsRetentionDays: number;
  members: number;
}

interface PlanInfo {
  id: PlanId;
  priceMonthly: number;
  priceSemiannual: number;
  limits: PlanLimits;
}

interface SubscriptionInfo {
  plan: PlanId;
  status: string;
  billingPeriod: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  graceUntil: string | null;
}

interface InvoiceInfo {
  id: string;
  order_id: string;
  plan: string;
  amount: number;
  status: string;
  payment_link: string | null;
  qr_string: string | null;
  va_number: string | null;
  payment_method: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

interface BillingState {
  workspace: { id: string; name: string; plan: PlanId; timezone: string; trialUsed: boolean };
  subscription: SubscriptionInfo | null;
  invoices: InvoiceInfo[];
  usage: {
    period: string;
    aiCredits: { used: number; limit: number };
    scheduledPosts: { used: number; limit: number };
  };
  plans: PlanInfo[];
}

interface CheckoutState {
  invoice: { id: string; orderId: string; plan: PlanId; amount: number };
  payment: {
    txnId: string;
    paymentLink: string | null;
    qrString: string | null;
    vaNumber: string | null;
    paymentMethod: string | null;
    expiresAt: string | null;
    isSandbox: boolean;
  };
}

const PLAN_ORDER: PlanId[] = ["free", "starter", "creator", "pro"];

function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
  });
}

export default function BillingPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [state, setState] = useState<BillingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await fetch("/api/billing/status");
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "unknown");
      }
      setState(data as BillingState);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "unknown");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      void load();
    });
  }, [router, load]);

  const planName = useCallback(
    (plan: PlanId) =>
      plan === "free"
        ? t.billing.planFree
        : plan === "starter"
          ? t.billing.planStarter
          : plan === "creator"
            ? t.billing.planCreator
            : t.billing.planPro,
    [t.billing],
  );

  const statusLabel = useMemo(() => {
    if (!state?.subscription) return t.billing.statusFree;
    switch (state.subscription.status) {
      case "active":
        return t.billing.statusActive;
      case "trialing":
        return t.billing.statusTrialing;
      case "canceled":
        return t.billing.statusCanceled;
      case "expired":
        return t.billing.statusExpired;
      case "past_due":
        return t.billing.statusPastDue;
      default:
        return t.billing.statusFree;
    }
  }, [state, t.billing]);

  const invoiceStatusLabel = useCallback(
    (status: string) =>
      status === "paid"
        ? t.billing.invoicePaid
        : status === "pending"
          ? t.billing.invoicePending
          : status === "expired"
            ? t.billing.invoiceExpired
            : t.billing.invoiceCanceled,
    [t.billing],
  );

  async function startCheckout(plan: PlanId) {
    if (plan === "free") return;
    setBusyPlan(plan);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.billing.checkoutFailed);
      }
      setCheckout({ invoice: data.invoice, payment: data.payment });
    } catch (error) {
      toast({
        title: t.billing.checkoutFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyPlan(null);
    }
  }

  async function checkPayment() {
    if (!checkout) return;
    setIsChecking(true);
    try {
      const response = await fetch("/api/billing/status");
      const data = (await response.json()) as { success: boolean } & BillingState;

      if (!response.ok || !data.success) {
        throw new Error(t.billing.notPaidYet);
      }

      setState(data);

      const paid = data.invoices?.find(
        (invoice) => invoice.order_id === checkout.invoice.orderId && invoice.status === "paid",
      );

      if (paid) {
        toast({ title: t.billing.paidToast });
        setCheckout(null);
      } else {
        toast({ title: t.billing.notPaidYet });
      }
    } catch {
      toast({ title: t.billing.notPaidYet });
    } finally {
      setIsChecking(false);
    }
  }

  async function startTrial() {
    setIsStartingTrial(true);
    try {
      const response = await fetch("/api/billing/trial", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(
          data.code === "trial_used" ? t.billing.trialUsed : t.billing.trialFailed,
        );
      }
      toast({
        title: t.billing.trialStarted(formatDate(data.trialEndsAt, locale)),
      });
      await load();
    } catch (error) {
      toast({
        title: t.billing.trialFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsStartingTrial(false);
    }
  }

  async function cancelPlan() {
    setIsCanceling(true);
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.billing.cancelFailed);
      }
      toast({ title: t.billing.canceledToast });
      setConfirmCancel(false);
      await load();
    } catch (error) {
      toast({
        title: t.billing.cancelFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsCanceling(false);
    }
  }

  const currentPlan = state?.workspace.plan ?? "free";
  const canCancel =
    state?.subscription != null &&
    (state.subscription.status === "active" || state.subscription.status === "trialing");
  const canStartTrial =
    state != null && !state.workspace.trialUsed && currentPlan === "free";

  const usageBars = state
    ? [
        {
          key: "ai",
          label: t.billing.aiCredits,
          used: state.usage.aiCredits.used,
          limit: state.usage.aiCredits.limit,
        },
        {
          key: "posts",
          label: t.billing.scheduledPosts,
          used: state.usage.scheduledPosts.used,
          limit: state.usage.scheduledPosts.limit,
        },
      ]
    : [];

  return (
    <>
      <Header />
      <main className="bg-background text-foreground">
        <div className="container mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-10">
          <header className="space-y-1.5 border-b pb-5">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              {t.billing.title}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t.billing.title}
            </h1>
            <p className="text-sm text-muted-foreground max-w-prose">
              {t.billing.subtitle}
            </p>
          </header>

          {isLoading ? (
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t.common.loading}
            </div>
          ) : loadError || !state ? (
            <div
              role="alert"
              className="mt-8 flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-destructive"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{t.media.loadFailed}</span>
              </div>
              <Button variant="outline" onClick={() => void load()} className="min-h-[44px]">
                {t.media.retry}
              </Button>
            </div>
          ) : (
            <>
              <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4" aria-labelledby="current-plan-heading">
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <h2
                    id="current-plan-heading"
                    className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {t.billing.currentPlanHeading}
                  </h2>

                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xl font-semibold">{planName(currentPlan)}</p>
                    <Badge variant={currentPlan === "free" ? "secondary" : "outline"} className="text-xs font-normal">
                      {statusLabel}
                    </Badge>
                  </div>

                  {state.subscription ? (
                    <p className="text-xs text-muted-foreground">
                      {state.subscription.status === "trialing"
                        ? t.billing.trialEndsOn(formatDate(state.subscription.currentPeriodEnd, locale))
                        : t.billing.renewsOn(formatDate(state.subscription.currentPeriodEnd, locale))}
                      {state.subscription.graceUntil
                        ? ` · ${t.billing.graceUntil(formatDate(state.subscription.graceUntil, locale))}`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t.billing.noSubscription}</p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {canStartTrial && (
                      <Button
                        onClick={() => void startTrial()}
                        disabled={isStartingTrial}
                        className="min-h-[44px]"
                      >
                        {isStartingTrial ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                            {t.common.loading}
                          </>
                        ) : (
                          t.billing.startTrial
                        )}
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="outline"
                        onClick={() => setConfirmCancel(true)}
                        className="min-h-[44px]"
                      >
                        {t.billing.cancelPlan}
                      </Button>
                    )}
                  </div>

                  {!state.workspace.trialUsed && currentPlan === "free" && (
                    <p className="text-[11px] text-muted-foreground">{t.billing.trialNote}</p>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <h2 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    {t.billing.usageHeading}
                  </h2>

                  {usageBars.map((bar) => {
                    const pct =
                      bar.limit > 0 ? Math.min(100, Math.round((bar.used / bar.limit) * 100)) : 0;
                    const nearLimit = pct >= 90;

                    return (
                      <div key={bar.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{bar.label}</span>
                          <span className="font-mono tabular-nums text-foreground">
                            {t.billing.usedOf(bar.used, bar.limit)}
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={bar.limit}
                          aria-valuenow={bar.used}
                          aria-label={bar.label}
                          className="h-2 rounded-full bg-muted overflow-hidden"
                        >
                          <div
                            className={`h-full rounded-full transition-[width] ${nearLimit ? "bg-destructive" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="mt-8 space-y-3" aria-labelledby="plans-heading">
                <h2
                  id="plans-heading"
                  className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {t.billing.plansHeading}
                </h2>

                <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {PLAN_ORDER.map((planId) => {
                    const plan = state.plans.find((entry) => entry.id === planId);
                    if (!plan) return null;

                    const isCurrent = currentPlan === planId;
                    const isUpgrade =
                      PLAN_ORDER.indexOf(planId) > PLAN_ORDER.indexOf(currentPlan);

                    return (
                      <li
                        key={planId}
                        className={`rounded-xl border bg-card p-4 space-y-3 ${
                          isCurrent ? "border-primary ring-1 ring-primary/30" : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{planName(planId)}</p>
                          {isCurrent && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {t.billing.currentBadge}
                            </Badge>
                          )}
                        </div>

                        <p className="text-lg font-semibold tabular-nums">
                          {planId === "free"
                            ? formatIdr(0)
                            : t.billing.perMonth(formatIdr(plan.priceMonthly))}
                        </p>

                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                          <li>{t.billing.channelsLabel(plan.limits.channels)}</li>
                          <li>{t.billing.postsLabel(plan.limits.scheduledPostsPerMonth)}</li>
                          <li>{t.billing.creditsLabel(plan.limits.aiCreditsPerMonth)}</li>
                          <li>{t.billing.storageLabel(formatBytes(plan.limits.mediaBytes))}</li>
                          <li>{t.billing.analyticsLabel(plan.limits.analyticsRetentionDays)}</li>
                        </ul>

                        {!isCurrent && planId !== "free" && (
                          <Button
                            onClick={() => void startCheckout(planId)}
                            disabled={busyPlan !== null}
                            variant={isUpgrade ? "default" : "outline"}
                            className="w-full min-h-[44px]"
                          >
                            {busyPlan === planId ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                                {t.common.loading}
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                {isUpgrade ? t.billing.upgrade : t.billing.downgrade}
                              </>
                            )}
                          </Button>
                        )}

                        {isCurrent && planId !== "free" && (
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Check className="h-3 w-3" aria-hidden="true" />
                            {t.billing.currentBadge}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="mt-8 space-y-3" aria-labelledby="invoices-heading">
                <h2
                  id="invoices-heading"
                  className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {t.billing.invoicesHeading}
                </h2>

                {state.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.billing.invoicesEmpty}</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border bg-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                          <th scope="col" className="px-3 py-2 font-normal">{t.billing.colDate}</th>
                          <th scope="col" className="px-3 py-2 font-normal">{t.billing.colPlan}</th>
                          <th scope="col" className="px-3 py-2 font-normal text-right">{t.billing.colAmount}</th>
                          <th scope="col" className="px-3 py-2 font-normal">{t.billing.colStatus}</th>
                          <th scope="col" className="px-3 py-2 font-normal" />
                        </tr>
                      </thead>
                      <tbody>
                        {state.invoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(invoice.created_at, locale)}
                            </td>
                            <td className="px-3 py-2 text-xs capitalize">{invoice.plan}</td>
                            <td className="px-3 py-2 text-xs text-right tabular-nums">
                              {formatIdr(invoice.amount)}
                            </td>
                            <td className="px-3 py-2 text-xs">{invoiceStatusLabel(invoice.status)}</td>
                            <td className="px-3 py-2 text-right">
                              {invoice.status === "pending" && invoice.payment_link && (
                                <a
                                  href={invoice.payment_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                                >
                                  {t.billing.openPayment}
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <Dialog open={checkout !== null} onOpenChange={(open) => !open && setCheckout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {checkout ? t.billing.checkoutTitle(planName(checkout.invoice.plan)) : ""}
            </DialogTitle>
            <DialogDescription>{t.billing.checkoutDesc}</DialogDescription>
          </DialogHeader>

          {checkout && (
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t.billing.orderId}</dt>
                <dd className="font-mono text-xs break-all text-right">{checkout.invoice.orderId}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t.billing.amount}</dt>
                <dd className="font-semibold tabular-nums">{formatIdr(checkout.invoice.amount)}</dd>
              </div>
              {checkout.payment.expiresAt && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t.billing.expiresLabel}</dt>
                  <dd className="text-xs">{formatDate(checkout.payment.expiresAt, locale)}</dd>
                </div>
              )}
              {checkout.payment.isSandbox && (
                <p className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                  {t.billing.sandboxNote}
                </p>
              )}
            </dl>
          )}

          {checkout && (
            <PaymentDetails
              qrString={checkout.payment.qrString}
              vaNumber={checkout.payment.vaNumber}
              paymentMethod={checkout.payment.paymentMethod}
            />
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setCheckout(null)}
              disabled={isChecking}
              className="min-h-[44px]"
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => void checkPayment()}
              disabled={isChecking}
              className="min-h-[44px]"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                  {t.billing.checking}
                </>
              ) : (
                t.billing.checkPayment
              )}
            </Button>
            {checkout?.payment.paymentLink && (
              <Button asChild className="min-h-[44px]">
                <a href={checkout.payment.paymentLink} target="_blank" rel="noopener noreferrer">
                  {t.billing.openPayment}
                  <ExternalLink className="h-4 w-4 ml-1.5" aria-hidden="true" />
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.billing.cancelTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.billing.cancelDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling} className="min-h-[44px]">
              {t.billing.cancelKeep}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void cancelPlan();
              }}
              disabled={isCanceling}
              className="min-h-[44px]"
            >
              {isCanceling ? t.billing.checking : t.billing.cancelConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
