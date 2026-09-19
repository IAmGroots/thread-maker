"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();
  const tweets = t.landing.sampleTweets;

  return (
    <>
      <Header />
      <main className="bg-background text-foreground">
        <div className="container mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left: the desk statement */}
            <div className="lg:col-span-5 space-y-6">
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                {t.landing.eyebrow}
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground text-balance">
                {t.landing.title}
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-prose">
                {t.landing.description}
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <Button
                  asChild
                  size="lg"
                  className="min-h-[44px] font-medium"
                >
                  <Link href="/generator">{t.landing.primaryCta}</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-[44px] font-medium"
                >
                  <Link href="/saved">{t.landing.secondaryCta}</Link>
                </Button>
              </div>

              <ul className="pt-5 border-t space-y-2.5">
                {t.landing.points.map((point, index) => (
                  <li
                    key={index}
                    className="flex items-baseline gap-3 text-sm text-muted-foreground"
                  >
                    <span className="font-mono tabular-nums text-xs text-muted-foreground/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: a sample thread, the "page" on the desk */}
            <div className="lg:col-span-7">
              <article className="rounded-xl border bg-card p-6 sm:p-8 text-card-foreground shadow-sm space-y-5">
                <div className="space-y-2 pb-4 border-b">
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    {t.landing.sampleEyebrow}
                  </p>
                  <h2 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                    {t.landing.sampleTopic}
                  </h2>
                </div>

                <ol className="space-y-3">
                  {tweets.map((content, index) => (
                    <li
                      key={index}
                      className="rounded-lg border bg-muted/20 p-4 space-y-2 transition-colors hover:border-foreground/20"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono tabular-nums">
                        <span className="font-semibold">
                          {String(index + 1).padStart(2, "0")} /{" "}
                          {String(tweets.length).padStart(2, "0")}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {content}
                      </p>
                    </li>
                  ))}
                </ol>

                <div className="pt-2">
                  <Link
                    href="/generator"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4 min-h-[44px]"
                  >
                    {t.landing.primaryCta}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
