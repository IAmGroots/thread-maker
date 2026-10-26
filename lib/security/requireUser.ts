import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AuthSuccess {
  user: { id: string; email?: string };
  response: null;
}

interface AuthFailure {
  user: null;
  response: NextResponse;
}

/**
 * Resolve the signed-in user for a route handler. AI endpoints cost money per
 * call, so they must never run anonymously.
 */
export async function requireUser(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: "Sign in required." },
        { status: 401 },
      ),
    };
  }

  return {
    user: { id: data.user.id, email: data.user.email ?? undefined },
    response: null,
  };
}
