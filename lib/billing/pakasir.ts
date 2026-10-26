import "server-only";

import type {
  ChargeResult,
  CreateChargeInput,
  PaymentMethod,
  PaymentProvider,
  TransactionState,
  TransactionStatus,
  WebhookPayload,
  WebhookVerification,
} from "@/lib/billing/types";

const DEFAULT_BASE_URL = "https://app.pakasir.com";

interface PakasirConfig {
  slug: string;
  apiKey: string;
  webhookSecret: string;
  baseUrl: string;
  sandbox: boolean;
}

function getConfig(): PakasirConfig {
  const slug = process.env.PAKASIR_SLUG?.trim() || "";
  const apiKey = process.env.PAKASIR_API_KEY?.trim() || "";
  const webhookSecret = process.env.PAKASIR_WEBHOOK_SECRET?.trim() || "";

  if (!slug || !apiKey || !webhookSecret) {
    throw new Error(
      "Pakasir is not configured (PAKASIR_SLUG, PAKASIR_API_KEY, PAKASIR_WEBHOOK_SECRET)",
    );
  }

  return {
    slug,
    apiKey,
    webhookSecret,
    baseUrl: process.env.PAKASIR_BASE_URL?.trim() || DEFAULT_BASE_URL,
    sandbox: process.env.PAKASIR_SANDBOX !== "false",
  };
}

interface CreateTransactionResponse {
  txn_id: string;
  payment_link?: string;
  qr_string?: string;
  va_number?: string;
  expired_at?: string;
  is_sandbox?: boolean;
  error?: string;
}

interface TransactionStatusResponse {
  txn_id: string;
  order_id: string;
  amount: number;
  status: TransactionStatus;
  completed_at?: string;
  is_sandbox?: boolean;
  error?: string;
}

/** Constant-time comparison so a wrong secret cannot be found byte by byte. */
function secretsMatch(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }

  return diff === 0;
}

/**
 * Order id for one billing period. Pakasir treats (slug, order_id) as
 * find-or-create, so an expired invoice must use a new attempt number.
 */
export function buildOrderId(
  workspaceId: string,
  period: string,
  attempt: number,
): string {
  return `INV-${workspaceId}-${period}-${attempt}`;
}

export function methodsForPlan(plan: "starter" | "creator" | "pro"): PaymentMethod[] {
  // Virtual accounts cost a flat Rp 3.500, which eats 7% of the Starter price.
  if (plan === "starter") return ["qris"];
  return ["qris", "bri_va", "bni_va", "cimb_niaga_va", "bnc_va", "bsi_va"];
}

export function createPakasirProvider(): PaymentProvider {
  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const config = getConfig();
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        "X-Api-Key": config.apiKey,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    });

    const body = (await response.json().catch(() => ({}))) as T & { error?: string };

    if (!response.ok) {
      throw new Error(`Pakasir ${path} failed (${response.status}): ${body.error ?? "unknown"}`);
    }

    return body;
  }

  return {
    id: "pakasir",

    async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
      const config = getConfig();
      const data = await request<CreateTransactionResponse>(
        `/api/v2/create-transaction/${config.slug}/${encodeURIComponent(input.orderId)}`,
        {
          method: "POST",
          body: JSON.stringify({ method: input.method, amount: input.amount }),
        },
      );

      return {
        txnId: data.txn_id,
        paymentLink: data.payment_link,
        qrString: data.qr_string,
        vaNumber: data.va_number,
        expiresAt: data.expired_at ? new Date(data.expired_at) : undefined,
        isSandbox: data.is_sandbox ?? config.sandbox,
      };
    },

    async getStatus(txnId: string): Promise<TransactionState> {
      const config = getConfig();
      const data = await request<TransactionStatusResponse>(
        `/api/v2/transaction-status/${config.slug}/${encodeURIComponent(txnId)}`,
        { method: "GET" },
      );

      return {
        txnId: data.txn_id,
        orderId: data.order_id,
        amount: data.amount,
        status: data.status,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        isSandbox: data.is_sandbox ?? config.sandbox,
      };
    },

    async verifyWebhook(
      headers: Headers,
      rawBody: string,
      expected: { orderId: string; amount: number },
    ): Promise<WebhookVerification> {
      const config = getConfig();
      const secret = headers.get("x-secret") ?? "";

      if (!secretsMatch(secret, config.webhookSecret)) {
        return { valid: false, reason: "bad_secret" };
      }

      let parsed: WebhookPayload;
      try {
        const body = JSON.parse(rawBody) as {
          txn_id?: string;
          order_id?: string;
          amount?: number;
          status?: TransactionStatus;
          completed_at?: string;
          is_sandbox?: boolean;
        };

        if (!body.txn_id || !body.order_id || typeof body.amount !== "number") {
          return { valid: false, reason: "malformed" };
        }

        parsed = {
          txnId: body.txn_id,
          orderId: body.order_id,
          amount: body.amount,
          status: body.status ?? "pending",
          completedAt: body.completed_at ? new Date(body.completed_at) : undefined,
          isSandbox: body.is_sandbox ?? false,
        };
      } catch {
        return { valid: false, reason: "malformed" };
      }

      if (parsed.orderId !== expected.orderId || parsed.amount !== expected.amount) {
        return { valid: false, reason: "mismatch" };
      }

      if (!config.sandbox && parsed.isSandbox) {
        return { valid: false, reason: "sandbox_in_production" };
      }

      if (config.sandbox && !parsed.isSandbox) {
        return { valid: false, reason: "live_in_sandbox" };
      }

      if (parsed.status !== "completed") {
        return { valid: false, reason: "not_completed" };
      }

      return { valid: true, payload: parsed };
    },
  };
}

/** True unless PAKASIR_SANDBOX is explicitly "false". */
export function pakasirSandboxEnabled(): boolean {
  return process.env.PAKASIR_SANDBOX !== "false";
}
