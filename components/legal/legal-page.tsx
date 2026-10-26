"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { useI18n } from "@/lib/i18n";
import {
  DELETION_SECTIONS,
  LEGAL_UPDATED_AT,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  type LegalSection,
} from "@/lib/legal/content";

type LegalDoc = "privacy" | "terms" | "deletion";

const SECTIONS: Record<LegalDoc, LegalSection[]> = {
  privacy: PRIVACY_SECTIONS,
  terms: TERMS_SECTIONS,
  deletion: DELETION_SECTIONS,
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t } = useI18n();

  const title =
    doc === "privacy"
      ? t.legal.privacyTitle
      : doc === "terms"
        ? t.legal.termsTitle
        : t.legal.deletionTitle;

  const subtitle =
    doc === "privacy"
      ? t.legal.privacySubtitle
      : doc === "terms"
        ? t.legal.termsSubtitle
        : t.legal.deletionSubtitle;

  return (
    <>
      <Header />
      <main className="bg-background text-foreground">
        <div className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t.legal.backToApp}
          </Link>

          <header className="mt-4 space-y-3 border-b pb-6">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              {t.legal.updatedLabel}: {LEGAL_UPDATED_AT}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.legal.languageNotice}
            </p>
          </header>

          <article className="mt-8 space-y-8">
            {SECTIONS[doc].map((section) => (
              <section key={section.heading} className="space-y-2.5">
                <h2 className="text-base font-semibold text-foreground">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-sm text-muted-foreground leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </article>

          <footer className="mt-10 border-t pt-6 space-y-1.5">
            <h2 className="text-base font-semibold text-foreground">
              {t.legal.contactLabel}
            </h2>
            {CONTACT_EMAIL ? (
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                [alamat email dukungan belum diisi]
              </p>
            )}
          </footer>
        </div>
      </main>
    </>
  );
}
