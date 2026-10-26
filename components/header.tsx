"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/auth/UserMenu";

const APP_LINKS = [
  { href: "/generator", key: "generator" },
  { href: "/saved", key: "savedLibrary" },
  { href: "/calendar", key: "calendar" },
  { href: "/queue", key: "queue" },
  { href: "/analytics", key: "analytics" },
  { href: "/media", key: "media" },
] as const;

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
        <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={cn(
              "hidden md:flex text-sm font-medium px-3 py-2 rounded-md transition-colors min-h-[44px] items-center",
              pathname === "/"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
            )}
          >
            {t.header.home}
          </Link>
          <div className="pl-1 sm:border-l sm:pl-2 flex items-center gap-1 sm:gap-1.5 min-h-[44px]">
            <NotificationBell />
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>

      <nav
        aria-label={t.header.navAria}
        className="border-t border-border/70 bg-background/60"
      >
        <div className="container mx-auto max-w-7xl px-2 sm:px-4">
          <ul className="flex items-stretch gap-0.5 overflow-x-auto">
            {APP_LINKS.map((entry) => {
              const active = pathname === entry.href;
              return (
                <li key={entry.href} className="shrink-0">
                  <Link
                    href={entry.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center min-h-[44px] px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      active
                        ? "border-primary text-foreground font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.header[entry.key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </header>
  );
}
