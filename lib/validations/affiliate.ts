import { z } from "zod";

export const affiliateStoryAngleEnum = z.enum([
  "problem-solution",
  "honest-review",
  "accidental-discovery",
  "before-after",
  "step-by-step",
]);

export const affiliateCtaPlacementEnum = z.enum(["last_tweet", "reply"]);

export const safeUrlSchema = z
  .string()
  .trim()
  .transform((val) => {
    if (!val) return val;
    if (!/^https?:\/\//i.test(val)) {
      return `https://${val}`;
    }
    return val;
  })
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL must be a valid HTTP or HTTPS address" }
  );

export const affiliateProductSchema = z.object({
  productName: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(120, "Product name is too long (max 120 characters)"),
  productUrl: safeUrlSchema.optional().or(z.literal("")),
  affiliateUrl: safeUrlSchema.pipe(
    z.string().min(1, "Affiliate URL is required")
  ),
  price: z.string().trim().max(50, "Price text too long").optional(),
  keyPoints: z
    .array(z.string().trim().max(200))
    .max(5, "Maximum 5 key points")
    .optional()
    .default([]),
  storyAngle: affiliateStoryAngleEnum.default("problem-solution"),
  disclosureTag: z.string().trim().max(150).optional().default(""),
  ctaPlacement: affiliateCtaPlacementEnum.default("last_tweet"),
});

export const affiliateConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    product: affiliateProductSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.enabled && !data.product) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Product details are required when affiliate mode is enabled",
        path: ["product"],
      });
    }
  });

export type AffiliateStoryAngleType = z.infer<typeof affiliateStoryAngleEnum>;
export type AffiliateCtaPlacementType = z.infer<
  typeof affiliateCtaPlacementEnum
>;
export type AffiliateProductType = z.infer<typeof affiliateProductSchema>;
export type AffiliateConfigType = z.infer<typeof affiliateConfigSchema>;
