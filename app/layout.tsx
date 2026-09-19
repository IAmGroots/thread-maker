import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"] });

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Threvo";
const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ??
  "Threvo turns your ideas into engaging threads and posts — no hassle, just simplicity.";
const APP_SHORT_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_SHORT_DESCRIPTION ??
  "A simple way to turn ideas into great threads.";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_SHORT_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            {children}
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
