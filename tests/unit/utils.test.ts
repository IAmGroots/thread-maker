import { describe, expect, it } from "vitest";
import {
  countThreadsChars,
  countTwitterChars,
  extractHashtags,
  hasEmojis,
  isValidTweetLength,
  safeHttpUrl,
  truncateText,
} from "@/lib/utils";

describe("countThreadsChars", () => {
  it("counts the full URL instead of the Twitter 23-char rule", () => {
    const url = "https://example.com/a/very/long/path/that/exceeds/23";
    const text = `read ${url} now`;
    expect(countThreadsChars(text)).toBe(text.length);
  });

  it("counts an emoji as one character", () => {
    expect(countThreadsChars("ship \u{1F680}")).toBe(6);
  });
});

describe("countTwitterChars", () => {
  it("counts plain text by length", () => {
    expect(countTwitterChars("hello")).toBe(5);
  });

  it("counts every URL as 23 characters", () => {
    const url = "https://example.com/a/very/long/path/that/exceeds/23";
    const text = `read ${url} now`;
    expect(countTwitterChars(text)).toBe(text.length - url.length + 23);
  });

  it("counts multiple URLs independently", () => {
    const a = "https://a.example/one";
    const b = "https://b.example/two";
    const text = `${a} and ${b}`;
    expect(countTwitterChars(text)).toBe(text.length - a.length - b.length + 46);
  });
});

describe("isValidTweetLength", () => {
  it("accepts text at the limit", () => {
    expect(isValidTweetLength("a".repeat(280))).toBe(true);
  });

  it("rejects text above the limit", () => {
    expect(isValidTweetLength("a".repeat(281))).toBe(false);
  });
});

describe("hasEmojis", () => {
  it("detects an emoji", () => {
    expect(hasEmojis("ship it \u{1F680}")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasEmojis("ship it")).toBe(false);
  });
});

describe("extractHashtags", () => {
  it("returns tags without the hash", () => {
    expect(extractHashtags("hello #buildinpublic #indie")).toEqual([
      "buildinpublic",
      "indie",
    ]);
  });

  it("returns an empty list when there are none", () => {
    expect(extractHashtags("hello")).toEqual([]);
  });
});

describe("safeHttpUrl", () => {
  it("keeps http and https", () => {
    expect(safeHttpUrl("https://example.com")).toBe("https://example.com/");
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects other protocols", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeHttpUrl("data:text/html,hi")).toBeUndefined();
  });

  it("rejects empty and malformed values", () => {
    expect(safeHttpUrl("")).toBeUndefined();
    expect(safeHttpUrl(null)).toBeUndefined();
    expect(safeHttpUrl("not a url")).toBeUndefined();
  });
});

describe("truncateText", () => {
  it("leaves short text alone", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("appends an ellipsis when cutting", () => {
    expect(truncateText("hello world", 5)).toBe("hello...");
  });
});
