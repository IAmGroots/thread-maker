import { describe, expect, it } from "vitest";
import {
  buildStoragePath,
  isAllowedImageType,
} from "@/lib/media/storage";

describe("isAllowedImageType", () => {
  it("accepts the formats Threads accepts", () => {
    expect(isAllowedImageType("image/jpeg")).toBe(true);
    expect(isAllowedImageType("image/png")).toBe(true);
  });

  it("rejects WebP, which Threads refuses as image_url", () => {
    expect(isAllowedImageType("image/webp")).toBe(false);
  });

  it("rejects other types", () => {
    expect(isAllowedImageType("image/gif")).toBe(false);
    expect(isAllowedImageType("image/svg+xml")).toBe(false);
    expect(isAllowedImageType("application/pdf")).toBe(false);
  });
});

describe("buildStoragePath", () => {
  it("puts every asset under its workspace folder", () => {
    const path = buildStoragePath("ws-123", "image/png", "asset-1");
    expect(path).toBe("ws-123/asset-1.png");
  });

  it("maps each mime type to its extension", () => {
    expect(buildStoragePath("w", "image/jpeg", "a")).toBe("w/a.jpg");
    expect(buildStoragePath("w", "image/png", "a")).toBe("w/a.png");
  });
});
