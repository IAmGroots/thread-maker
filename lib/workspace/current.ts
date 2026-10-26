import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/billing/credits";

export interface CurrentWorkspace {
  id: string;
  name: string;
  plan: PlanId;
  timezone: string;
  role: string;
  trialUsed: boolean;
}

/**
 * Resolve the signed-in user's workspace. The MVP gives every user one
 * personal workspace; team switching arrives with invites in a later phase.
 * Returns null when there is no session.
 */
export async function getCurrentWorkspace(): Promise<CurrentWorkspace | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);

  let workspaceId = membership?.workspace_id;
  let role = membership?.role ?? "owner";

  if (!workspaceId) {
    const { data: createdId, error: createError } = await supabase.rpc(
      "ensure_personal_workspace",
    );
    if (createError) throw new Error(createError.message);
    workspaceId = createdId ?? undefined;
    role = "owner";
  }

  if (!workspaceId) {
    throw new Error("Could not resolve a workspace for this account.");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, plan, timezone, trial_used")
    .eq("id", workspaceId)
    .single();

  if (workspaceError) throw new Error(workspaceError.message);

  return {
    id: workspace.id,
    name: workspace.name,
    plan: workspace.plan as PlanId,
    timezone: workspace.timezone,
    role,
    trialUsed: Boolean(workspace.trial_used),
  };
}
