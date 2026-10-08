import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { ThreadsConnections } from "@/components/settings/ThreadsConnections";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ threads_connected?: string; threads_error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { threads_connected, threads_error } = await searchParams;

  const { data: accounts } = await supabase
    .from("threads_accounts")
    .select("id, username, token_expires_at, connected_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("connected_at", { ascending: false });

  return (
    <>
      <Header />
      <main className="min-h-full bg-background text-foreground">
        <div className="container mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-16">
          <ThreadsConnections
            accounts={accounts ?? []}
            justConnected={threads_connected === "1"}
            connectionError={threads_error}
          />
        </div>
      </main>
    </>
  );
}
