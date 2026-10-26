"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";

interface PaymentDetailsProps {
  qrString: string | null;
  vaNumber: string | null;
  paymentMethod: string | null;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: t.toasts.copied });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t.toasts.copyFailed, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div className="flex items-start gap-2">
        <code className="flex-1 break-all rounded-md border bg-background px-2 py-1.5 font-mono text-[11px] leading-relaxed">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copy()}
          className="min-h-[36px] shrink-0"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span className="sr-only">{t.common.copy}</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * Shows whatever Pakasir returned for this transaction: a hosted payment link,
 * a QRIS payload rendered as a scannable image, and/or a virtual account number.
 */
export function PaymentDetails({
  qrString,
  vaNumber,
  paymentMethod,
}: PaymentDetailsProps) {
  const { t } = useI18n();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!qrString) {
      setQrDataUrl(null);
      return;
    }

    QRCode.toDataURL(qrString, { margin: 1, width: 220 })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });

    return () => {
      active = false;
    };
  }, [qrString]);

  if (!qrString && !vaNumber) return null;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      {qrString && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">
            {t.billing.qrisLabel}
          </p>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={t.billing.qrisAlt}
              width={220}
              height={220}
              className="mx-auto rounded-md bg-white p-2"
            />
          ) : (
            <CopyRow label={t.billing.qrisLabel} value={qrString} />
          )}
        </div>
      )}

      {vaNumber && (
        <CopyRow
          label={
            paymentMethod
              ? `${t.billing.vaLabel} (${paymentMethod.replace(/_/g, " ").toUpperCase()})`
              : t.billing.vaLabel
          }
          value={vaNumber}
        />
      )}
    </div>
  );
}
