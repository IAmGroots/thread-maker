export type PaymentProviderId = "pakasir";

export type PaymentMethod =
  | "payment_link"
  | "qris"
  | "bri_va"
  | "bni_va"
  | "cimb_niaga_va"
  | "danamon_va"
  | "maybank_va"
  | "bnc_va"
  | "bsi_va"
  | "muamalat_va"
  | "ocbc_va";

export type TransactionStatus = "pending" | "completed" | "canceled";

export interface CreateChargeInput {
  orderId: string;
  amount: number;
  method: PaymentMethod;
}

export interface ChargeResult {
  txnId: string;
  paymentLink?: string;
  qrString?: string;
  vaNumber?: string;
  expiresAt?: Date;
  isSandbox: boolean;
}

export interface TransactionState {
  txnId: string;
  orderId: string;
  amount: number;
  status: TransactionStatus;
  completedAt?: Date;
  isSandbox: boolean;
}

export interface WebhookPayload {
  txnId: string;
  orderId: string;
  amount: number;
  status: TransactionStatus;
  completedAt?: Date;
  isSandbox: boolean;
}

export interface WebhookVerification {
  valid: boolean;
  reason?: string;
  payload?: WebhookPayload;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getStatus(txnId: string): Promise<TransactionState>;
  /**
   * Verify the raw request before it is trusted. Implementations must compare
   * the shared secret and the expected order, not just the status field.
   */
  verifyWebhook(
    headers: Headers,
    rawBody: string,
    expected: { orderId: string; amount: number },
  ): Promise<WebhookVerification>;
}
