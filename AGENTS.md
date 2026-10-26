# AGENTS.md

Project guidance for AI coding agents working in the Threvo (threads-maker) repository.

## Project

Threvo is a Next.js 15 / React 19 app that turns a topic into thread content. Stack: TypeScript, Tailwind CSS, shadcn-style UI on Radix primitives, `lucide-react` icons, `next-themes` for light/dark, Zustand, OpenAI for generation.

- `app/` — routes and API handlers
- `components/` — UI (`ui/`, `generator/`, `results/`, `saved/`, `legal/`)
- `lib/` — i18n, AI client/prompts, storage, security, validations, providers, queue, publish worker, media, analytics, notifications, billing
- `supabase/migrations/` — SQL migrations, the source of truth for the schema
- `docs/` — ADRs, target schema, migration plan, platform notes, pricing
- `DESIGN.md` — the design direction (palette, typography, dials). Read it before any UI change.

## App surfaces

`/generator` (AI studio), `/saved` (library, server-side search and paging), `/calendar` (drag-to-reschedule), `/queue` (status, retry, publish now), `/analytics` (Threads insights), `/media` (image library), `/settings` (accounts and workspace), `/billing` (plans, invoices, trial), `/privacy`, `/terms`, `/data-deletion`.

## Plan limits live twice

`lib/billing/credits.ts` is for UI and tests. `public.plan_limit()` in `0008_analytics_notifications_usage.sql` is the enforced copy. Change both together, or the UI will disagree with the API.

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build (required before finishing)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit tests
npm run test:e2e   # Playwright smoke tests (starts the dev server)
npm run db:push    # apply supabase/migrations to the linked project
```

## Where decisions live

- `docs/adr/` — deployment and queue, tenancy and content model, billing, provider adapters, publish pipeline
- `docs/schema-v2.md` — target tables, indexes, and RLS
- `docs/migration-plan.md` — migration steps and rollback
- `docs/platform-integrations.md` — provider limits and review checklists
- `docs/pricing.md` — plans and limits

Read the relevant ADR before changing architecture. Do not add a new provider, queue, or payment integration without one.

## Publishing flow

`POST /api/threads/publish` returns `202` and a `targetId`; the chain runs in `ctx.waitUntil` and the client polls `GET /api/targets/[id]`. The cron worker (`/api/cron/publish-scheduled`) is the fallback. Never run a chain inline in a request. See `docs/adr/0005-publish-pipeline.md`.

## Media

Only JPEG and PNG are accepted. Threads rejects WebP as `image_url`, so it is refused at upload time in `lib/media/storage.ts` and in the bucket policy.

## Conventions

- Read `DESIGN.md` for visual direction and `antislop.md` (core) plus the relevant skill for UI, copy, accessibility, mobile layout, or code-comment work before changing those.
- All user-facing copy is internationalized through `lib/i18n` (`en.ts` / `id.ts`). Do not hardcode UI strings in components.
- Run `npx next build` (or `tsc --noEmit`) to verify changes compile.
- Run `npm test` after changing anything under `lib/`. Add a test when you add a pure function or a validation rule.

<!-- antislop:start -->
## antislop

For UI, copy, people, mobile layout, or code comments work, read `.opencode/skills/antislop/SKILL.md` (core) and then the skill for the task. Every antislop file lives under `.opencode/skills/`:

- Core: `.opencode/skills/antislop/SKILL.md`
- UI / visual: `.opencode/skills/antislop-ui/SKILL.md`
- Copy & text: `.opencode/skills/antislop-copywriting/SKILL.md`
- People: `.opencode/skills/antislop-human/SKILL.md` (also needs `contrast-check.py` from that folder)
- Mobile / responsive: `.opencode/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `.opencode/skills/antislop-code/SKILL.md`

Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->
