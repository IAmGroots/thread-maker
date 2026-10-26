import { afterEach, describe, expect, it, vi } from "vitest";
import { validateThreadsPost, threadsProvider } from "@/lib/providers/threads";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

interface Call {
  url: string;
  method: string;
  body: string;
}

/** Minimal Threads Graph API stand-in. */
function mockThreadsApi(handlers: {
  container?: (call: Call, index: number) => Response;
  status?: (containerId: string) => Response;
  publish?: (containerId: string) => Response;
}) {
  const calls: Call[] = [];
  let containerIndex = 0;

  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? init.body : "";
    const call: Call = { url, method, body };
    calls.push(call);

    if (url.endsWith("/me/threads") && method === "POST") {
      const index = containerIndex++;
      return handlers.container?.(call, index) ?? json({ id: `container-${index}` });
    }

    if (url.includes("/me/threads_publish")) {
      const params = new URLSearchParams(body);
      return handlers.publish?.(params.get("creation_id") ?? "") ?? json({ id: "post-1" });
    }

    const statusMatch = url.match(/\/([^/?]+)\?/);
    const containerId = statusMatch?.[1] ?? "";
    return handlers.status?.(containerId) ?? json({ status: "FINISHED" });
  }) as unknown as typeof fetch;

  return { calls };
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("validateThreadsPost", () => {
  it("accepts a normal thread", () => {
    const result = validateThreadsPost({ segments: ["one", "two"] });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects an empty thread", () => {
    expect(validateThreadsPost({ segments: [] }).valid).toBe(false);
  });

  it("rejects a segment above 500 characters", () => {
    const result = validateThreadsPost({ segments: ["a".repeat(501)] });
    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe("too_long");
  });

  it("rejects more than 15 segments", () => {
    const segments = Array.from({ length: 16 }, (_, i) => `post ${i}`);
    const result = validateThreadsPost({ segments });
    expect(result.issues.some((issue) => issue.code === "too_many_segments")).toBe(true);
  });

  it("rejects a blank segment", () => {
    const result = validateThreadsPost({ segments: ["one", "   "] });
    expect(result.issues.some((issue) => issue.code === "empty_segment")).toBe(true);
  });
});

describe("threadsProvider.publish", () => {
  it("publishes a single post and reports the id", async () => {
    mockThreadsApi({
      publish: () => json({ id: "post-1" }),
    });

    const result = await threadsProvider.publish({
      accessToken: "token",
      post: { segments: ["hello"] },
      idempotencyKey: "k1",
    });

    expect(result.status).toBe("published");
    expect(result.providerPostId).toBe("post-1");
    expect(result.publishedCount).toBe(1);
    expect(result.total).toBe(1);
  });

  it("reports checkpoints as each post lands", async () => {
    mockThreadsApi({
      publish: (containerId) => json({ id: `post-${containerId}` }),
    });

    const checkpoints: number[] = [];

    const result = await threadsProvider.publish({
      accessToken: "token",
      post: { segments: ["one", "two"] },
      idempotencyKey: "k2",
      onCheckpoint: async (checkpoint) => {
        checkpoints.push(checkpoint);
      },
    });

    expect(result.status).toBe("published");
    expect(checkpoints).toEqual([1, 2]);
    expect(result.publishedCount).toBe(2);
  });

  it("resumes from a checkpoint without republishing earlier posts", async () => {
    const { calls } = mockThreadsApi({
      publish: () => json({ id: "post-2" }),
    });

    const result = await threadsProvider.publish({
      accessToken: "token",
      post: { segments: ["one", "two"] },
      idempotencyKey: "k3",
      checkpoint: 1,
      providerState: { lastPostId: "post-1", primaryPostId: "post-1" },
    });

    const containerCalls = calls.filter((call) => call.url.endsWith("/me/threads"));
    expect(containerCalls).toHaveLength(1);
    expect(containerCalls[0].body).toContain("reply_to_id=post-1");

    expect(result.status).toBe("published");
    expect(result.publishedCount).toBe(2);
    expect(result.providerPostId).toBe("post-1");
  });

  it("returns an absolute failure index after a partial resume", async () => {
    mockThreadsApi({
      container: (_call, index) =>
        index === 0 ? json({ id: "container-1" }) : json({ error: "nope" }, 403),
      publish: () => json({ id: "post-2" }),
    });

    const result = await threadsProvider.publish({
      accessToken: "token",
      post: { segments: ["one", "two", "three"] },
      idempotencyKey: "k4",
      checkpoint: 1,
      providerState: { lastPostId: "post-1" },
    });

    expect(result.status).toBe("partial");
    // The chain resumed at index 1 and failed on index 2, which is the third
    // post of the original thread. The index must be absolute, not re-offset.
    expect(result.failedAtIndex).toBe(2);
    expect(result.publishedCount).toBe(2);
  });

  it("sends the image only on the first post", async () => {
    const { calls } = mockThreadsApi({
      publish: () => json({ id: "post-1" }),
    });

    await threadsProvider.publish({
      accessToken: "token",
      post: {
        segments: ["one", "two"],
        media: [{ url: "https://example.com/a.jpg", mimeType: "image/jpeg" }],
      },
      idempotencyKey: "k5",
    });

    const containerCalls = calls.filter((call) => call.url.endsWith("/me/threads"));
    expect(containerCalls[0].body).toContain("media_type=IMAGE");
    expect(containerCalls[0].body).toContain("image_url=");
    expect(containerCalls[1].body).toContain("media_type=TEXT");
  });

  it("fails the target when the container reports an error", async () => {
    mockThreadsApi({
      status: () => json({ status: "ERROR", error_message: "bad media" }),
    });

    const result = await threadsProvider.publish({
      accessToken: "token",
      post: { segments: ["hello"] },
      idempotencyKey: "k6",
    });

    expect(result.status).toBe("failed");
    expect(result.publishedCount).toBe(0);
    expect(result.failedAtIndex).toBe(0);
    expect(result.errorMessage).toContain("bad media");
  });
});
