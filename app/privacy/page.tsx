import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · Threvo",
  description: "What Threvo stores, why, and what you can ask us to remove.",
};

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}
