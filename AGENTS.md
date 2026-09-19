# AGENTS.md

Project guidance for AI coding agents working in the Threvo (threads-maker) repository.

## Project

Threvo is a Next.js 15 / React 19 app that turns a topic into thread content. Stack: TypeScript, Tailwind CSS, shadcn-style UI on Radix primitives, `lucide-react` icons, `next-themes` for light/dark, Zustand, OpenAI for generation.

- `app/` — routes and API handlers
- `components/` — UI (`ui/`, `generator/`, `results/`)
- `lib/` — i18n, AI client/prompts, storage, security, validations
- `DESIGN.md` — the design direction (palette, typography, dials). Read it before any UI change.

## Conventions

- Read `DESIGN.md` for visual direction and `antislop.md` (core) plus the relevant skill for UI, copy, accessibility, mobile layout, or code-comment work before changing those.
- All user-facing copy is internationalized through `lib/i18n` (`en.ts` / `id.ts`). Do not hardcode UI strings in components.
- Run `npx next build` (or `tsc --noEmit`) to verify changes compile.

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
