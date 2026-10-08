import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/security/apiError";

const disconnectSchema = z.object({
  accountId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const raw = await request.json();
    const parsed = disconnectSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    // RLS scopes the delete to the current user; the explicit user_id filter is
    // a belt-and-braces guard.
    const { error } = await supabase
      .from("threads_accounts")
      .delete()
      .eq("id", parsed.data.accountId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "threads-disconnect", 500);
  }
}
