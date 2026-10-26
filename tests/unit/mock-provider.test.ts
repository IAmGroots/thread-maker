import { describe, expect, it, vi } from "vitest";
import { withMockPublish } from "@/lib/providers/mock-threads";
import { threadsProvider } from "@/lib/providers/threads";

describe("withMockPublish", () => {
  it("publishes every segment and reports checkpoints", async () => {
    const provider = withMockPublish(threadsProvider);
    const checkpoints: number[] = [];

    const result = await provider.publish({
      accessToken: "unused",
      post: { segments: ["one", "two"] },
      idempotencyKey: "mock-1",
      onCheckpoint: async (checkpoint) => {
        checkpoints.push(checkpoint);
      },
    });

    expect(result.status).toBe("published");
    expect(result.publishedCount).toBe(2);
    expect(checkpoints).toEqual([1, 2]);
  });

  it("resumes from a checkpoint", async () => {
    const provider = withMockPublish(threadsProvider);

    const result = await provider.publish({
      accessToken: "unused",
      post: { segments: ["one", "two", "three"] },
      idempotencyKey: "mock-2",
      checkpoint: 2,
      providerState: { lastPostId: "post-2", primaryPostId: "post-1" },
    });

    expect(result.publishedCount).toBe(3);
    expect(result.providerPostId).toBe("post-1");
  });

  it("stops on a segment containing FAIL and reports the absolute index", async () => {
    const provider = withMockPublish(threadsProvider);

    const result = await provider.publish({
      accessToken: "unused",
      post: { segments: ["one", "FAIL here", "three"] },
      idempotencyKey: "mock-3",
    });

    expect(result.status).toBe("partial");
    expect(result.failedAtIndex).toBe(1);
    expect(result.publishedCount).toBe(1);
    expect(result.errorMessage).toContain("Simulated failure");
  });

  it("keeps the real validation and capabilities", () => {
    const provider = withMockPublish(threadsProvider);
    expect(provider.capabilities).toEqual(threadsProvider.capabilities);
    expect(provider.validatePost).toBe(threadsProvider.validatePost);
  });

  it("logs a warning so the mock is never silent", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    withMockPublish(threadsProvider);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("PROVIDER_MOCK=1"));
    spy.mockRestore();
  });
});
