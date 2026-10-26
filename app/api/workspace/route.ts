import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { apiErrorResponse } from "@/lib/security/apiError";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine(
      (value) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      },
      { message: "Unknown timezone" },
    ),
});

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    return NextResponse.json({ success: true, workspace });
  } catch (error) {
    return apiErrorResponse(error, "workspace-get", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    if (workspace.role !== "owner" && workspace.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only workspace admins can change these settings." },
        { status: 403 },
      );
    }

    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(", ");
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workspaces")
      .update({
        name: parsed.data.name,
        timezone: parsed.data.timezone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspace.id)
      .select("id, name, timezone")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, workspace: data });
  } catch (error) {
    return apiErrorResponse(error, "workspace-update", 500);
  }
}
