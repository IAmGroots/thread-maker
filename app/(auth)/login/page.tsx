import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginCard } from "@/components/auth/LoginCard";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <LoginCard authError={error === "auth_failed"} />
    </main>
  );
}
