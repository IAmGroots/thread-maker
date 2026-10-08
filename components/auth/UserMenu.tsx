"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UserMenuClient } from "./UserMenuClient";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export function UserMenu() {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Avoid a flash of the wrong control: reserve the slot until the session is
  // known. Signing out swaps this for the Sign in button.
  if (!ready) {
    return <div className="h-11 w-11 sm:h-9 sm:w-9 rounded-full bg-secondary border border-border" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className="min-h-[44px] gap-1.5 px-2.5 sm:px-3"
      >
        <Link href="/login" aria-label={t.auth.signIn}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t.auth.signIn}</span>
        </Link>
      </Button>
    );
  }

  return (
    <UserMenuClient
      profile={{
        fullName: user.user_metadata?.full_name as string | undefined,
        avatarUrl: user.user_metadata?.avatar_url as string | undefined,
        email: user.email,
      }}
    />
  );
}
