import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service · Threvo",
  description: "The rules for using Threvo and publishing through it.",
};

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
