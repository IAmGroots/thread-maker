import { afterEach, describe, expect, it } from "vitest";
import {
  buildOrderId,
  createPakasirProvider,
  methodsForPlan,
} from "@/lib/billing/pakasir";

describe("buildOrderId", () => {
  it("includes workspace, period, and attempt", () => {
    expect(buildOrderId("ws-1", "202610", 1)).toBe("INV-ws-1-202610-1");
  });

  it("produces a new id for a retried invoice", () => {
    expect(buildOrderId("ws-1", "202610", 2)).not.toBe(
      buildOrderId("ws-1", "202610", 1),
    );
  });
});

describe("methodsForPlan", () => {
  it("offers QRIS only on Starter", () => {
    expect(methodsForPlan("starter")).toEqual(["qris"]);
  });

  it("adds virtual accounts on Creator and Pro", () => {
    expect(methodsForPlan("creator")).toContain("qris");
    expect(methodsForPlan("creator")).toContain("bri_va");
    expect(methodsForPlan("pro")).toContain("bni_va");
  });
});

const ORIGINAL_ENV = { ...process.env };

function configure(sandbox: "true" | "false") {
  process.env.PAKASIR_SLUG = "test-slug";
  process.env.PAKASIR_API_KEY = "test-key";
  process.env.PAKASIR_WEBHOOK_SECRET = "test-secret";
  process.env.PAKASIR_SANDBOX = sandbox;
}

function webhookBody(isSandbox: boolean) {
  return JSON.stringify({
    txn_id: "txn-1",
    order_id: "INV-1",
    amount: 49000,
    status: "completed",
    is_sandbox: isSandbox,
  });
}

const expected = { orderId: "INV-1", amount: 49000 };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("Pakasir sandbox verification", () => {
  it("rejects a live callback while sandbox mode is on", async () => {
    configure("true");
    const provider = createPakasirProvider();
    const result = await provider.verifyWebhook(
      new Headers({ "x-secret": "test-secret" }),
      webhookBody(false),
      expected,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("live_in_sandbox");
  });

  it("rejects a sandbox callback in production", async () => {
    configure("false");
    const provider = createPakasirProvider();
    const result = await provider.verifyWebhook(
      new Headers({ "x-secret": "test-secret" }),
      webhookBody(true),
      expected,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("sandbox_in_production");
  });

  it("accepts a matching sandbox callback in sandbox mode", async () => {
    configure("true");
    const provider = createPakasirProvider();
    const result = await provider.verifyWebhook(
      new Headers({ "x-secret": "test-secret" }),
      webhookBody(true),
      expected,
    );
    expect(result.valid).toBe(true);
  });

  it("rejects a wrong secret", async () => {
    configure("true");
    const provider = createPakasirProvider();
    const result = await provider.verifyWebhook(
      new Headers({ "x-secret": "nope" }),
      webhookBody(true),
      expected,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("bad_secret");
  });
});
