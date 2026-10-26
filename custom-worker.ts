// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

interface ScheduledContext {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Custom Cloudflare worker entry point.
 *
 * The generated OpenNext worker only exports `fetch`, so a Cron Trigger has no
 * `scheduled` handler to call. This wrapper keeps the generated fetch handler
 * and forwards each cron tick to the matching authenticated route.
 */
const CRON_ROUTES: Record<string, string> = {
  // Every five minutes: pull insights. Kept separate from publishing so a slow
  // analytics sync never delays a scheduled post.
  "*/5 * * * *": "/api/cron/sync-analytics",
  // Every minute: the publish queue and account maintenance.
  "* * * * *": "/api/cron/publish-scheduled",
};

interface ScheduledEvent {
  cron?: string;
}

export default {
  fetch: handler.fetch,

  async scheduled(
    event: ScheduledEvent,
    env: CloudflareEnv,
    ctx: ScheduledContext,
  ) {
    const path = CRON_ROUTES[event.cron ?? ""] ?? CRON_ROUTES["* * * * *"];

    const request = new Request(`https://threvo.internal${path}`, {
      method: "GET",
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });

    ctx.waitUntil(handler.fetch(request, env, ctx));
  },
};
