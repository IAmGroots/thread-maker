import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/http/origin";

export async function POST(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const requestOrigin = request.headers.get("origin");

  // CSRF guard: a browser always sends Origin on a cross-site POST.
  if (requestOrigin) {
    try {
      if (new URL(requestOrigin).origin !== origin) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Request origin is not permitted." },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Forbidden: Request origin is not permitted." },
        { status: 403 },
      );
    }
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
