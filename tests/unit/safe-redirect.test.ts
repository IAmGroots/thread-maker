import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/http/safeRedirect";

describe("safeNextPath", () => {
  it("keeps an internal path with query and hash", () => {
    expect(safeNextPath("/saved?tab=favorites#top")).toBe("/saved?tab=favorites#top");
  });

  it("defaults to the home page when missing", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("rejects absolute URLs", () => {
    expect(safeNextPath("https://evil.example/phish")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
  });

  it("rejects credential-style hosts", () => {
    expect(safeNextPath("@evil.example")).toBe("/");
    expect(safeNextPath("/@evil.example")).toBe("/@evil.example");
  });

  it("rejects non-http protocols", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });
});
