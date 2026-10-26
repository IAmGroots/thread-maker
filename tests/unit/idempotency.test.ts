import { describe, expect, it } from "vitest";
import {
  contentFingerprint,
  publishNowIdempotencyKey,
  scheduleIdempotencyKey,
} from "@/lib/threads/idempotency";

describe("contentFingerprint", () => {
  it("is stable for the same segments", async () => {
    const a = await contentFingerprint(["one", "two"]);
    const b = await contentFingerprint(["one", "two"]);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("changes when the content changes", async () => {
    const a = await contentFingerprint(["one", "two"]);
    const b = await contentFingerprint(["one", "three"]);
    expect(a).not.toBe(b);
  });
});

describe("idempotency keys", () => {
  it("uses the request id for publish-now retries", () => {
    expect(publishNowIdempotencyKey("fp", "acc", "req-1")).toBe(
      "now:req-1:acc:no-media",
    );
  });

  it("falls back to a minute bucket without a request id", () => {
    const key = publishNowIdempotencyKey("fp", "acc");
    expect(key.startsWith("now:fp:acc:")).toBe(true);
  });

  it("treats the same text with a different image as a different post", () => {
    expect(publishNowIdempotencyKey("fp", "acc", "req-1", "m1")).not.toBe(
      publishNowIdempotencyKey("fp", "acc", "req-1", "m2"),
    );
  });

  it("includes account and time for a scheduled slot", () => {
    expect(
      scheduleIdempotencyKey("fp", "acc", "2026-10-17T10:00:00.000Z"),
    ).toBe("fp:acc:2026-10-17T10:00:00.000Z:no-media");
  });

  it("separates scheduled slots that differ only by image", () => {
    expect(
      scheduleIdempotencyKey("fp", "acc", "2026-10-17T10:00:00.000Z", "m1"),
    ).not.toBe(
      scheduleIdempotencyKey("fp", "acc", "2026-10-17T10:00:00.000Z", "m2"),
    );
  });
});
