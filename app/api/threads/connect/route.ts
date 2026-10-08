import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl, THREADS_STATE_COOKIE } from "@/lib/threads/oauth";
import { getRequestOrigin } from "@/lib/http/origin";
import { apiErrorResponse } from "@/lib/security/apiError";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const origin = getRequestOrigin(request);
    if (!user) {
      return NextResponse.redirect(`${origin}/login`);
    }

    const state = crypto.randomUUID();
    const authorizeUrl = buildAuthorizeUrl(state);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(THREADS_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    return apiErrorResponse(error, "threads-connect", 500);
  }
}
