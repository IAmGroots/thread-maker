"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2 max-w-7xl">
        <div className="flex items-center gap-2 sm:gap-8 min-w-0">
          <Link
            href="/"
            className="text-lg sm:text-3xl font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity flex items-center min-h-[44px] min-w-0 truncate"
          >
            {process.env.NEXT_PUBLIC_APP_NAME ?? "Threvo"}
          </Link>
        </div>
        <nav
          aria-label={t.header.navAria}
          className="flex items-center gap-0.5 sm:gap-2 shrink-0"
        >
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={cn(
              "text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-colors min-h-[44px] flex items-center",
              pathname === "/"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
            )}
          >
            {t.header.home}
          </Link>
          <Link
            href="/generator"
            aria-current={pathname === "/generator" ? "page" : undefined}
            className={cn(
              "text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-colors min-h-[44px] flex items-center",
              pathname === "/generator"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
            )}
          >
            {t.header.generator}
          </Link>
          <Link
            href="/saved"
            aria-current={pathname === "/saved" ? "page" : undefined}
            className={cn(
              "text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-colors min-h-[44px] flex items-center",
              pathname === "/saved"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
            )}
          >
            <span className="hidden sm:inline">{t.header.savedLibrary}</span>
            <span className="sm:hidden">{t.header.savedLibraryShort}</span>
          </Link>
          <div className="ml-0 pl-1 border-l sm:ml-2 sm:pl-2 flex items-center gap-1 sm:gap-1.5 min-h-[44px]">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
