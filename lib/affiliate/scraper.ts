import { assertSafeUrl } from "@/lib/security/ssrf";

export interface ScrapedAffiliateProduct {
  originalUrl: string;
  resolvedUrl: string;
  title: string;
  description: string;
  image: string;
  price: string;
  fallbackToManual: boolean;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function extractMeta(html: string, propertyOrName: string): string {
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["'](?:og:|twitter:)?${propertyOrName}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const match = html.match(regex);
  if (match && match[1]) {
    return decodeHtmlEntities(match[1]);
  }

  const reversedRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["'](?:og:|twitter:)?${propertyOrName}["']`,
    "i"
  );
  const revMatch = html.match(reversedRegex);
  if (revMatch && revMatch[1]) {
    return decodeHtmlEntities(revMatch[1]);
  }

  return "";
}

function extractTitle(html: string): string {
  const ogTitle = extractMeta(html, "title");
  if (ogTitle) return ogTitle;
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (match && match[1]) {
    return decodeHtmlEntities(match[1]);
  }
  return "";
}

function extractPrice(html: string): string {
  const metaPrice =
    extractMeta(html, "price:amount") ||
    extractMeta(html, "product:price:amount");
  if (metaPrice) return metaPrice;

  const match = html.match(/Rp\s*([0-9.,]+)/i);
  if (match && match[1]) {
    return `Rp${match[1].trim()}`;
  }

  return "";
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\|\s*Shopee\s*(Indonesia)?/gi, "")
    .replace(/\s*\|\s*Tokopedia/gi, "")
    .replace(/\s*\|\s*TikTok\s*(Shop)?/gi, "")
    .replace(/\s*-\s*Beli di Shopee.*/gi, "")
    .trim();
}

export async function resolveAndScrapeAffiliate(
  inputUrl: string,
  maxHops: number = 5
): Promise<ScrapedAffiliateProduct> {
  let currentUrl = inputUrl;
  let hops = 0;

  try {
    while (hops < maxHops) {
      await assertSafeUrl(currentUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      let response: Response;
      try {
        response = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent":
              "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) break;

        const resolvedRedirect = new URL(location, currentUrl).href;
        currentUrl = resolvedRedirect;
        hops++;
        continue;
      }

      if (response.status === 200) {
        const rawText = await response.text();
        const html = rawText.slice(0, 500000);

        const rawTitle = extractTitle(html);
        const description = extractMeta(html, "description");
        const image = extractMeta(html, "image");
        const price = extractPrice(html);

        const lowerTitle = rawTitle.toLowerCase();
        const isBlocked =
          lowerTitle.includes("just a moment") ||
          lowerTitle.includes("attention required") ||
          lowerTitle.includes("cloudflare") ||
          html.includes("cf-browser-verification") ||
          html.includes("captcha");

        if (isBlocked || !rawTitle) {
          return {
            originalUrl: inputUrl,
            resolvedUrl: currentUrl,
            title: "",
            description: "",
            image: "",
            price: "",
            fallbackToManual: true,
          };
        }

        return {
          originalUrl: inputUrl,
          resolvedUrl: currentUrl,
          title: cleanTitle(rawTitle),
          description,
          image,
          price,
          fallbackToManual: false,
        };
      }

      return {
        originalUrl: inputUrl,
        resolvedUrl: currentUrl,
        title: "",
        description: "",
        image: "",
        price: "",
        fallbackToManual: true,
      };
    }

    return {
      originalUrl: inputUrl,
      resolvedUrl: currentUrl,
      title: "",
      description: "",
      image: "",
      price: "",
      fallbackToManual: true,
    };
  } catch {
    return {
      originalUrl: inputUrl,
      resolvedUrl: currentUrl,
      title: "",
      description: "",
      image: "",
      price: "",
      fallbackToManual: true,
    };
  }
}
