import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPakasirProvider, methodsForPlan } from "@/lib/billing/pakasir";
import {
  getPlanPrice,
  isPaidPlan,
  PLAN_PRICES_IDR,
  PLAN_PRICES_SEMIANNUAL_IDR,
} from "@/lib/billing/credits";

const SECRET = "test-webhook-secret";

function webhookBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    txn_id: "txn-1",
    order_id: "INV-ws-2026-10-1",
    amount: 49_000,
    status: "completed",
    is_sandbox: true,
    completed_at: "2026-10-17T10:00:00.000Z",
    ...overrides,
  });
}

describe("verifyWebhook", () => {
  const provider = createPakasirProvider();
  const original = {
    slug: process.env.PAKASIR_SLUG,
    key: process.env.PAKASIR_API_KEY,
    secret: process.env.PAKASIR_WEBHOOK_SECRET,
    sandbox: process.env.PAKASIR_SANDBOX,
  };

  beforeAll(() => {
    process.env.PAKASIR_SLUG = "threvo";
    process.env.PAKASIR_API_KEY = "key";
    process.env.PAKASIR_WEBHOOK_SECRET = SECRET;
    process.env.PAKASIR_SANDBOX = "true";
  });

  afterAll(() => {
    process.env.PAKASIR_SLUG = original.slug;
    process.env.PAKASIR_API_KEY = original.key;
    process.env.PAKASIR_WEBHOOK_SECRET = original.secret;
    process.env.PAKASIR_SANDBOX = original.sandbox;
  });

  const expected = { orderId: "INV-ws-2026-10-1", amount: 49_000 };

  it("accepts a completed payment with the right secret", async () => {
    const headers = new Headers({ "x-secret": SECRET });
    const result = await provider.verifyWebhook(headers, webhookBody(), expected);

    expect(result.valid).toBe(true);
    expect(result.payload?.txnId).toBe("txn-1");
    expect(result.payload?.status).toBe("completed");
  });

  it("rejects a wrong secret", async () => {
    const headers = new Headers({ "x-secret": "wrong" });
    const result = await provider.verifyWebhook(headers, webhookBody(), expected);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("bad_secret");
  });

  it("rejects a missing secret", async () => {
    const result = await provider.verifyWebhook(new Headers(), webhookBody(), expected);
    expect(result.reason).toBe("bad_secret");
  });

  it("rejects an amount that does not match the invoice", async () => {
    const headers = new Headers({ "x-secret": SECRET });
    const result = await provider.verifyWebhook(
      headers,
      webhookBody({ amount: 1_000 }),
      expected,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("mismatch");
  });

  it("rejects a different order id", async () => {
    const headers = new Headers({ "x-secret": SECRET });
    const result = await provider.verifyWebhook(
      headers,
      webhookBody({ order_id: "INV-other" }),
      expected,
    );
    expect(result.reason).toBe("mismatch");
  });

  it("rejects a payment that is not completed yet", async () => {
    const headers = new Headers({ "x-secret": SECRET });
    const result = await provider.verifyWebhook(
      headers,
      webhookBody({ status: "pending" }),
      expected,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("not_completed");
  });

  it("rejects a sandbox callback in production", async () => {
    process.env.PAKASIR_SANDBOX = "false";
    const headers = new Headers({ "x-secret": SECRET });
    const result = await provider.verifyWebhook(headers, webhookBody(), expected);
    expect(result.reason).toBe("sandbox_in_production");
    process.env.PAKASIR_SANDBOX = "true";
  });

  it("rejects a malformed body", async () => {
    const headers = new Headers({ "x-secret": SECRET });
    const result = await provider.verifyWebhook(headers, "not json", expected);
    expect(result.reason).toBe("malformed");
  });
});

describe("plan pricing", () => {
  it("returns the monthly price", () => {
    expect(getPlanPrice("starter")).toBe(49_000);
    expect(getPlanPrice("creator")).toBe(89_000);
    expect(getPlanPrice("pro")).toBe(149_000);
  });

  it("returns the six-month price, which is two months free", () => {
    expect(getPlanPrice("starter", "semiannual")).toBe(
      PLAN_PRICES_IDR.starter * 4 + PLAN_PRICES_IDR.starter,
    );
    expect(getPlanPrice("creator", "semiannual")).toBe(
      PLAN_PRICES_SEMIANNUAL_IDR.creator,
    );
  });

  it("prices Free at zero", () => {
    expect(getPlanPrice("free")).toBe(0);
    expect(getPlanPrice("free", "semiannual")).toBe(0);
  });
});

describe("isPaidPlan", () => {
  it("accepts the paid plans", () => {
    expect(isPaidPlan("starter")).toBe(true);
    expect(isPaidPlan("creator")).toBe(true);
    expect(isPaidPlan("pro")).toBe(true);
  });

  it("rejects free and unknown values", () => {
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan("enterprise")).toBe(false);
  });
});

describe("methodsForPlan", () => {
  it("offers QRIS only on Starter", () => {
    expect(methodsForPlan("starter")).toEqual(["qris"]);
  });

  it("adds virtual accounts on Creator and Pro", () => {
    expect(methodsForPlan("creator")).toContain("bni_va");
    expect(methodsForPlan("pro")).toContain("bsi_va");
  });
});
