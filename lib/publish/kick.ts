import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { processTargetById } from "@/lib/publish/worker";

/**
 * Start a target in the background and return immediately.
 *
 * On Cloudflare the publish runs inside `ctx.waitUntil`, so the response can be
 * sent while the chain is still publishing. Everywhere else (local dev, other
 * hosts) the kick is skipped and the cron worker picks the target up within a
 * minute; the client polls the target either way.
 */
export async function kickTarget(targetId: string): Promise<boolean> {
  const run = async () => {
    try {
      await processTargetById(createAdminClient(), targetId);
    } catch (error) {
      // The cron retry path handles anything that fails here.
      console.error(`[publish] background run failed for ${targetId}:`, error);
    }
  };

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(run());
    return true;
  } catch {
    return false;
  }
}
