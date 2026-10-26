import { describe, expect, it } from "vitest";
import {
  generateConfigSchema,
  generateRequestSchema,
  regenerateTweetRequestSchema,
  transformRequestSchema,
} from "@/lib/validations/generator";

const validConfig = { topic: "how to ship a side project" };

describe("generateConfigSchema", () => {
  it("fills defaults for an omitted optional field", () => {
    const parsed = generateConfigSchema.parse(validConfig);
    expect(parsed.format).toBe("thread");
    expect(parsed.numberOfTweets).toBe(5);
    expect(parsed.numberOfVersions).toBe(1);
    expect(parsed.style).toBe("casual");
    expect(parsed.tone).toBe("friendly");
    expect(parsed.language).toBe("id");
    expect(parsed.customHashtags).toEqual([]);
  });

  it("rejects an empty topic", () => {
    expect(() => generateConfigSchema.parse({ topic: "   " })).toThrow();
  });

  it("rejects a topic over 1000 characters", () => {
    expect(() =>
      generateConfigSchema.parse({ topic: "a".repeat(1001) }),
    ).toThrow();
  });

  it("caps the thread at 15 tweets", () => {
    expect(() =>
      generateConfigSchema.parse({ ...validConfig, numberOfTweets: 16 }),
    ).toThrow();
  });

  it("caps versions at 5", () => {
    expect(() =>
      generateConfigSchema.parse({ ...validConfig, numberOfVersions: 6 }),
    ).toThrow();
  });

  it("caps custom hashtags at 10", () => {
    expect(() =>
      generateConfigSchema.parse({
        ...validConfig,
        customHashtags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
      }),
    ).toThrow();
  });

  it("rejects an unknown style", () => {
    expect(() =>
      generateConfigSchema.parse({ ...validConfig, style: "viral" }),
    ).toThrow();
  });
});

describe("generateRequestSchema", () => {
  it("requires a config object", () => {
    expect(() => generateRequestSchema.parse({})).toThrow();
    expect(generateRequestSchema.parse({ config: validConfig }).config.topic).toBe(
      validConfig.topic,
    );
  });
});

describe("transformRequestSchema", () => {
  it("accepts 1 to 15 tweets", () => {
    const parsed = transformRequestSchema.parse({
      tweets: ["one"],
      newStyle: "storytelling",
      newTone: "friendly",
    });
    expect(parsed.tweets).toHaveLength(1);
  });

  it("rejects more than 15 tweets", () => {
    expect(() =>
      transformRequestSchema.parse({
        tweets: Array.from({ length: 16 }, () => "text"),
        newStyle: "storytelling",
        newTone: "friendly",
      }),
    ).toThrow();
  });
});

describe("regenerateTweetRequestSchema", () => {
  it("rejects a negative index", () => {
    expect(() =>
      regenerateTweetRequestSchema.parse({ tweetIndex: -1, context: [] }),
    ).toThrow();
  });

  it("caps context at 15 entries", () => {
    expect(() =>
      regenerateTweetRequestSchema.parse({
        tweetIndex: 0,
        context: Array.from({ length: 16 }, () => "text"),
      }),
    ).toThrow();
  });
});
