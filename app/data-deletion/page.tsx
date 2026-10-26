import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Data Deletion · Threvo",
  description: "How to remove your content, connected accounts, and account.",
};

export default function DataDeletionPage() {
  return <LegalPage doc="deletion" />;
}
