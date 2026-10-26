import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { ThreadsConnections } from "@/components/settings/ThreadsConnections";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { listAccounts } from "@/lib/social/accounts";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ threads_connected?: string; threads_error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const { threads_connected, threads_error } = await searchParams;

  const accounts = await listAccounts(supabase, workspace.id);

  return (
    <>
      <Header />
      <main className="min-h-full bg-background text-foreground">
        <div className="container mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-16">
          <ThreadsConnections
            accounts={accounts}
            workspace={{
              name: workspace.name,
              plan: workspace.plan,
              timezone: workspace.timezone,
              role: workspace.role,
            }}
            justConnected={threads_connected === "1"}
            connectionError={threads_error}
          />
        </div>
      </main>
    </>
  );
}
