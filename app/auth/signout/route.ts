import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/http/origin";

export async function POST(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
