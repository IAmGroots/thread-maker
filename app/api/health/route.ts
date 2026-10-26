import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe. No auth: it returns only aggregate health, never
 * workspace data.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("workspaces")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      status: "ok",
      database: "ok",
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "unavailable",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
