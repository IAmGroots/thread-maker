import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { safeUrlSchema } from "@/lib/validations/affiliate";
import { resolveAndScrapeAffiliate } from "@/lib/affiliate/scraper";
import { assertSafeUrl } from "@/lib/security/ssrf";

const resolveRequestSchema = z.object({
  url: safeUrlSchema,
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const validation = resolveRequestSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid URL",
        },
        { status: 400 }
      );
    }

    const { url } = validation.data;

    try {
      await assertSafeUrl(url);
    } catch (ssrfError) {
      return NextResponse.json(
        {
          success: false,
          error:
            ssrfError instanceof Error
              ? ssrfError.message
              : "Restricted URL target",
        },
        { status: 400 }
      );
    }

    const scraped = await resolveAndScrapeAffiliate(url);

    return NextResponse.json({
      success: true,
      data: scraped,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to resolve URL",
      },
      { status: 500 }
    );
  }
}
