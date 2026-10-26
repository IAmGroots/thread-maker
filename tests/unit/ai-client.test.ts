import { describe, expect, it } from "vitest";
import { parseJSONResponse } from "@/lib/ai/client";

describe("parseJSONResponse", () => {
  it("parses a plain object", () => {
    expect(parseJSONResponse('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses a markdown fenced block", () => {
    const raw = 'Here you go:\n```json\n{"tweets":[{"content":"hi"}]}\n```';
    expect(parseJSONResponse(raw)).toEqual({ tweets: [{ content: "hi" }] });
  });

  it("extracts JSON surrounded by prose", () => {
    const raw = 'Sure. {"tweets":[{"content":"one"}]} Let me know if you need more.';
    expect(parseJSONResponse(raw)).toEqual({ tweets: [{ content: "one" }] });
  });

  it("removes a trailing comma", () => {
    expect(parseJSONResponse('{"a":1,"b":2,}')).toEqual({ a: 1, b: 2 });
  });

  it("repairs a truncated payload", () => {
    const raw = '{"tweets":[{"content":"first"},{"content":"second"}';
    expect(parseJSONResponse(raw)).toEqual({
      tweets: [{ content: "first" }, { content: "second" }],
    });
  });

  it("throws on a response with no JSON", () => {
    expect(() => parseJSONResponse("I cannot help with that.")).toThrow(
      "Failed to parse AI response",
    );
  });
});
