"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { LogOut, Settings } from "lucide-react";

interface Profile {
  fullName?: string;
  avatarUrl?: string;
  email?: string;
}

export function UserMenuClient({ profile }: { profile: Profile }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = profile.fullName ?? profile.email ?? "";

  const initials = profile.fullName
    ? profile.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : profile.email?.[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={t.auth.accountMenuAria(displayName)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center justify-center h-11 w-11 sm:h-9 sm:w-9 rounded-full border border-border bg-secondary hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background overflow-hidden"
      >
        {profile.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt=""
            width={36}
            height={36}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-xs font-semibold text-foreground">{initials}</span>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t.auth.accountMenuAria(displayName)}
          className="absolute right-0 top-[calc(100%+1rem)] z-50 w-48 rounded-xl border border-border bg-card shadow-md"
        >
          <div className="p-3 border-b border-border flex flex-col gap-1">
            {profile.fullName && (
              <p className="text-sm font-medium text-foreground truncate">
                {profile.fullName}
              </p>
            )}
            {profile.email && (
              <p className="text-xs text-muted-foreground truncate">
                {profile.email}
              </p>
            )}
          </div>

          <div className="py-2">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2.5 min-h-[44px] text-sm text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t.header.settings}
            </Link>
            <button
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-2 w-full px-3 py-2.5 min-h-[44px] text-sm text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {signingOut ? t.auth.signingOut : t.auth.signOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
