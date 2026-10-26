# Threvo - AI Tweet & Thread Generator

Turn your thoughts into threads. Generate viral tweets and threads with AI. Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI, and any OpenAI-compatible API.

---

## 🚀 Key Features

- **AI-Powered Generation**: Create engaging single tweets or structured threads (1-15 tweets) with 1-5 versions simultaneously.
- **Deep Customization**:
  - **9 Writing Styles**: Professional, Casual, Storytelling, Educational, Humorous, Controversial, Persuasive, Inspirational, News-style.
  - **8 Tones**: Friendly, Confident, Witty, Authoritative, Emotional, Casual, Formal, Sarcastic.
  - **6 Content Goals**: Engagement, Personal Branding, Education, Promotion, Follower Growth, Affiliate Storytelling.
  - **Audience Targeting**: Define a specific target audience for each generation.
  - **Granular Controls**: Toggle Hooks, Call-to-Actions (CTA), emojis, automatic hashtags, and custom hashtags (max 10).
  - **Length Presets**: Short (~120–200), Medium (~220–320), or Long (~350–480) characters.
- **Affiliate Storytelling**: Fill in product details (name, affiliate URL, price, key points, disclosure tag) and let AI craft an authentic story around it with 5 story angles and 2 CTA placements (URLs are rendered separately, never pasted into the tweet text).
- **Interactive Editing Studio**:
  - **Inline Editing**: Edit any tweet directly in the preview card with real-time character count.
  - **Single Tweet Regeneration**: Regenerate only a specific tweet while preserving the rest of the thread.
  - **Transform Style & Tone**: Re-tone and adapt existing threads on the fly using AI.
  - **Adjust Length**: Shorten or lengthen individual tweets with one click.
- **Suggested Topics (AI + Local Pool)**: Instant offline-safe topic suggestions from a curated local pool, supplemented by fresh, trending topics from `/api/suggest-topics`, with a one-click shuffle/refresh button.
- **Load to Studio**: Reopen any saved thread back into the generator with all settings restored.
- **Bilingual Content**: Generate content in Bahasa Indonesia or English.
- **Bilingual UI (i18n)**: Language switcher for English and Bahasa Indonesia with persistent preferences.
- **Dark & Light Mode**: Theme toggling with automatic system preference detection via `next-themes`.
- **Cloud Library**: Save, search, filter, and manage threads in Supabase Postgres, scoped to the signed-in user with row-level security.
- **Google Sign-In**: Supabase Auth with a Google OAuth provider; sessions refresh in middleware.
- **Threads Connect & Publish**: OAuth connection, encrypted long-lived tokens, publish now, and per-account "already posted" status.
- **Scheduled Publishing**: Schedule a thread, list and cancel it, or retry a failed run. A Postgres queue with idempotency keys and per-post checkpoints is drained by a Cloudflare Cron Trigger every minute (via `custom-worker.ts`).
- **Calendar & Queue**: A month calendar where a scheduled post can be dragged to another day, and a queue view with real status, errors, retry, reschedule, cancel, and publish-now.
- **Threads Insights**: Published posts are synced into analytics snapshots; the dashboard shows views, likes, replies, shares, and engagement over 7, 30, or 90 days.
- **Notifications**: In-app bell for publish success, partial failures, and errors, with unread count and mark-all-read.
- **Plan Quotas**: AI credits and scheduled posts are counted per workspace per month and enforced in the database, so a client cannot raise its own limit.
- **Billing**: Prepaid monthly plans paid through Pakasir (QRIS or virtual account). A verified webhook extends the period, a 7-day Creator trial is available once per workspace, and expired plans fall back to Free after a 3-day grace period.
- **Media Library**: Upload JPEG, PNG, or WebP images (up to 8 MB), edit alt text, and attach one image to a scheduled Threads post. Files live in a private Supabase Storage bucket scoped to the workspace.
- **Workspaces**: Every account gets a personal workspace; all content, accounts, media, and targets are scoped to it.
- **Export & Copy**: One-click formatted copying, plus export to JSON or TXT.
- **Multi-Provider AI Gateway**: Declare multiple OpenAI-compatible providers with priority-based automatic failover (server-only keys).
- **Built-in Security**: Middleware origin checks, per-endpoint IP rate limiting, Zod request validation, prompt-injection defense, and hardened security headers.

---

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm, yarn, or pnpm
- An API key from any OpenAI-compatible provider (9router, OpenAI, Groq, OpenRouter, etc.)

### Installation

1. **Clone repository & install dependencies**

   ```bash
   cd threads-maker
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your credentials:

   ```env
   # Multi-provider AI gateway (recommended) , SINGLE LINE JSON array.
   # Priority is ascending: a LOWER number is tried first; on failure the
   # gateway fails over to the next provider.
   OPENAI_PROVIDERS=[{"id":"9router","baseURL":"https://api.9router.com/v1","apiKey":"sk-...","model":"bansos","priority":1},{"id":"openrouter","baseURL":"https://openrouter.ai/api/v1","apiKey":"sk-or-...","model":"openai/gpt-4o-mini","priority":2}]

   # Legacy single-provider config (fallback when OPENAI_PROVIDERS is empty/invalid)
   OPENAI_API_ENDPOINT=https://...
   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL_NAME=model-ai

   # Max output tokens per AI request (defaults to 4000 when unset)
   AI_MAX_TOKENS=4000

   # Branding
   NEXT_PUBLIC_APP_NAME=Threvo
   NEXT_PUBLIC_APP_TAGLINE=Turn your thoughts into threads.
   NEXT_PUBLIC_APP_DESCRIPTION=Threvo turns your ideas into threads and posts you can edit before you post them.
   NEXT_PUBLIC_APP_SHORT_DESCRIPTION=A simple way to turn ideas into great threads.

   # Storage
   NEXT_PUBLIC_MAX_THREADS_STORAGE=100
   ```

3. **Run development server**

   ```bash
   npm run dev
   ```

4. **Open in browser**

   ```text
   http://localhost:3000
   ```

---

## 📁 Project Structure

```text
threads-maker/
├── app/
│   ├── api/
│   │   ├── generate/route.ts           # Main generation endpoint
│   │   ├── regenerate-tweet/route.ts   # Single tweet regeneration
│   │   ├── transform/route.ts          # Style/tone transformation
│   │   ├── adjust-length/route.ts      # Shorten/lengthen tweet
│   │   ├── suggest-topics/route.ts     # AI-generated trending topics
│   │   ├── cron/publish-scheduled/     # Worker cron entry point
│   │   └── threads/                    # Connect, callback, publish, schedule
│   ├── generator/
│   │   └── page.tsx                    # Studio generator page
│   ├── saved/
│   │   └── page.tsx                    # Saved threads library, search, import & export
│   ├── globals.css
│   ├── layout.tsx                      # Root layout with Theme & i18n providers
│   └── page.tsx                        # Landing / marketing page
├── components/
│   ├── generator/                      # Form & customization inputs
│   │   ├── AdvancedOptions.tsx
│   │   ├── AffiliateSection.tsx
│   │   ├── CustomizationPanel.tsx
│   │   ├── StyleSelector.tsx
│   │   ├── ToneSelector.tsx
│   │   └── TopicInput.tsx
│   ├── results/                        # Tweet preview & editing cards
│   │   ├── AdjustLengthDialog.tsx
│   │   ├── InspirationPrompts.tsx      # Suggested topics + shuffle
│   │   ├── ThreadConnectorLine.tsx
│   │   ├── ThreadPreview.tsx
│   │   ├── ThreadSkeletonLoader.tsx
│   │   ├── TransformDialog.tsx
│   │   ├── TweetActions.tsx
│   │   ├── TweetCard.tsx
│   │   └── VersionTabs.tsx
│   ├── ui/                            # Shadcn UI primitives
│   ├── header.tsx                     # Navigation header
│   ├── language-switcher.tsx          # ID/EN switcher
│   ├── theme-provider.tsx             # Theme context
│   └── theme-toggle.tsx               # Dark/Light toggle
├── config/
│   ├── ai-provider.ts                 # Backwards-compatible re-export
│   └── ai-providers.ts                # Multi-provider registry & validation
├── hooks/
│   ├── use-toast.ts
│   └── useLocalStorage.ts
├── lib/
│   ├── ai/
│   │   ├── client.ts                  # AI client + resilient JSON parser
│   │   ├── gateway.ts                 # Failover-by-priority AI gateway
│   │   └── prompts.ts                 # Prompt engineering system
│   ├── i18n/                          # Internationalization dictionaries
│   │   ├── en.ts
│   │   ├── id.ts
│   │   ├── index.tsx
│   │   └── types.ts
│   ├── prompts/
│   │   └── topic-pool.ts              # Local suggested-topics pool
│   ├── security/
│   │   └── rateLimit.ts               # Rate limiter (shared store, in-memory fallback)
│   ├── storage/
│   │   ├── localStorage.ts            # Legacy local exports & topic buffer
│   │   └── threads.ts                 # Supabase-backed thread library
│   ├── workspace/                     # Current workspace resolution
│   ├── social/                        # Account vault (tokens, refresh)
│   ├── content/                       # Content item resolution
│   ├── media/                         # Storage paths and signed URLs
│   ├── publish/                       # Queue worker (claim, publish, retry)
│   ├── analytics/                     # Threads insights and snapshot sync
│   ├── notifications/                 # In-app notification service
│   ├── calendar/                      # Month grid helpers
│   ├── supabase/                      # Browser, server, admin, and middleware clients
│   ├── threads/                       # Threads OAuth, client, crypto, and publish chain
│   ├── validations/                   # Zod request schemas
│   │   ├── affiliate.ts
│   │   └── generator.ts
│   └── utils.ts                       # Helper utilities
├── supabase/
│   └── migrations/                    # SQL migrations (source of truth)
├── types/
│   ├── css.d.ts
│   ├── generator.ts                   # Generator configuration types
│   ├── storage.ts                     # Storage schemas
│   └── thread.ts                      # Tweet and thread interfaces
├── docs/
│   ├── adr/                            # Architecture decision records
│   ├── schema-v2.md                    # Target database schema
│   ├── migration-plan.md               # Migration steps and rollback
│   ├── platform-integrations.md        # Provider limits and review checklists
│   ├── pricing.md                      # Plans, limits, and billing rules
│   ├── PROJECT_COMPLETE.md
│   └── QUICKSTART.md
├── middleware.ts                      # Auth session refresh + origin check + rate limiting
├── .env.example
├── .eslintrc.json
├── components.json                    # Shadcn UI configuration
├── next.config.ts                     # Next.js config + security headers
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔧 Environment Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `OPENAI_PROVIDERS` | Multi-provider registry (single-line JSON array, ascending `priority` = failover order) | `[{"id":"9router",...}]` |
| `OPENAI_API_ENDPOINT` | Legacy single-provider endpoint (fallback) | `https://api.9router.com/v1` |
| `OPENAI_API_KEY` | Legacy single-provider API key (fallback) | `sk-xxx` |
| `OPENAI_MODEL_NAME` | Legacy single-provider model (fallback) | `model-ai` |
| `AI_MAX_TOKENS` | Max output tokens per AI request (defaults to `4000`) | `4000` |
| `NEXT_PUBLIC_APP_NAME` | App display name | `Threvo` |
| `NEXT_PUBLIC_APP_TAGLINE` | App tagline | `Turn your thoughts into threads.` |
| `NEXT_PUBLIC_APP_DESCRIPTION` | App meta description | `Threvo turns your ideas into...` |
| `NEXT_PUBLIC_APP_SHORT_DESCRIPTION` | Short app description | `A simple way to turn ideas into...` |
| `NEXT_PUBLIC_MAX_THREADS_STORAGE` | Legacy cap used by the local export helpers | `100` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for the cron publisher | `eyJ...` |
| `SUPABASE_DB_PASSWORD` | Used only by `npm run db:push` | `...` |
| `TOKEN_ENCRYPTION_KEY` | 32-byte base64 key for social tokens at rest | `...` |
| `THREADS_APP_ID` | Meta app id | `...` |
| `THREADS_APP_SECRET` | Meta app secret | `...` |
| `THREADS_REDIRECT_URI` | OAuth callback, must match the Meta app | `https://app.example/api/threads/callback` |
| `CRON_SECRET` | Bearer token for the cron endpoint | `...` |
| `NEXT_PUBLIC_APP_URL` | Canonical public origin used for OAuth redirects | `https://app.example.com` |
| `TOKEN_ENCRYPTION_KEY_OLD` | Previous key, used only to decrypt during rotation | `...` |
| `TRUSTED_IP_HEADER` | Proxy header that carries the real client IP | `cf-connecting-ip` |
| `UPSTASH_REDIS_REST_URL` | Shared rate-limit store (optional) | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Shared rate-limit token (optional) | `...` |
| `PAKASIR_SLUG` | Pakasir project slug | `threvo` |
| `PAKASIR_API_KEY` | Pakasir project API key | `...` |
| `PAKASIR_WEBHOOK_SECRET` | Value of the `X-Secret` webhook header | `...` |
| `PAKASIR_BASE_URL` | Pakasir API base | `https://app.pakasir.com` |
| `PAKASIR_SANDBOX` | Reject live callbacks while `true` | `true` |

---

## 🔌 Supported API Providers

This app works with any OpenAI-compatible API provider. Configure one or more via `OPENAI_PROVIDERS` (with automatic failover), or use the legacy single-provider variables:

- **9router**: `https://api.9router.com/v1`
- **OpenRouter**: `https://openrouter.ai/api/v1`
- **OpenAI**: `https://api.openai.com/v1`
- **Groq**: `https://api.groq.com/openai/v1`

> Note for cloud deploys (Vercel/Netlify): endpoints must be publicly reachable , a local router such as `http://localhost:20128/v1` will not work in the cloud.

---

## �,�️ Database setup

Apply the migrations with `npm run db:push`. They are additive and idempotent, so re-running is safe.

| Migration | Adds |
|---|---|
| `0001` to `0003` | Profiles, Threads accounts, saved threads, publish log, scheduled posts |
| `0004_workspace_schema_v2` | Workspaces, members, `social_accounts`, `content_items`, `content_segments`, `media_assets`, `post_targets`, `post_target_media`, `publish_attempts`, queue functions, the `workspace-media` bucket, plus the backfill from the legacy tables |
| `0005` | Placeholder that keeps the remote migration history aligned |
| `0006_billing` | `subscriptions`, `invoices`, `payment_events`, `plan_price`, `apply_paid_invoice`, `start_creator_trial`, `cancel_subscription`, `expire_due_subscriptions`, `create_expiry_reminders` |
| `0007_sync_scopes` | Mirror trigger keeps the stored OAuth scopes current on reconnect |
| `0008_analytics_notifications_usage` | `analytics_snapshots`, `notifications`, `usage_counters`, `plan_limit`, `consume_usage`/`refund_usage`, `search_saved_threads` |
| `0009_workspace_security` | Billing columns locked, token columns hidden, tenant consistency triggers, server-only writes, aggregate media usage |
| `0010_target_transactions` | Atomic `create_post_target` (quota + target + media) and status guards |
| `0011_billing_payment_details` | `qr_string`, `va_number`, `payment_method`, renewal across `canceled` |
| `0012_retention` | `prune_expired_data` for analytics and notifications |
| `0013_library_search_escape` | Library search matches wildcards literally |
| `0014_publish_integrity` | Refunds a scheduled slot when a target fails before any post goes out; media bucket limited to JPEG and PNG |
| `0015_notification_params` | Notifications carry structured `params` so the UI renders them in the reader's language |

`0004` also backfills a personal workspace per existing user, mirrors existing Threads accounts and saved threads into the new tables, and copies pending scheduled posts into `post_targets`.

### Scheduled work

`wrangler.toml` registers two cron triggers, and `custom-worker.ts` maps each to a route:

| Cron | Route | Work |
|---|---|---|
| `* * * * *` | `/api/cron/publish-scheduled` | Publish due targets, refresh tokens nearing expiry, expire subscriptions, send renewal reminders, prune old analytics |
| `*/5 * * * *` | `/api/cron/sync-analytics` | Pull Threads insights for recently published posts |

Both routes require `Authorization: Bearer $CRON_SECRET`.

### Publishing is asynchronous

`POST /api/threads/publish` returns `202` with a `targetId`; the chain runs in the background and the client polls `GET /api/targets/[id]` for progress. A target that fails before publishing anything gets its scheduled-post slot back. See `docs/adr/0005-publish-pipeline.md`.


### Pakasir webhook

Register `https://<domain>/api/billing/pakasir/webhook` in the Pakasir project. The endpoint is exempt from the origin check (the caller is a server), verifies `X-Secret`, matches the order and amount, then re-reads the transaction from Pakasir before granting access. Keep `PAKASIR_SANDBOX=true` until the live credentials are in place.

> **Reconnect required for insights**: `threads_manage_insights` was added to the OAuth scopes. Accounts connected before this change must be disconnected and reconnected in Settings before analytics can be collected.

## 🧪 Tests

```bash
npm test           # Vitest unit tests
npm run test:e2e   # Playwright smoke tests against a production build
# Simulate Threads publishing locally (nothing is sent to Meta):
#   PROVIDER_MOCK=1 npm run dev

```

## 🔒 Security

- **Middleware**: Validates request origin (method, `Sec-Fetch-Site`, Origin/Referer/host) and applies rate limiting to `/api/*` routes.
- **Rate Limiting**: Two layers. Middleware applies a coarse per-IP backstop (20-40 req/min depending on route). Each AI route also enforces a per-user budget (5-10 req/min) because it costs provider credit. When `UPSTASH_REDIS_REST_URL` is set the counters are shared across instances; otherwise they fall back to an in-memory store, which is only exact on a single instance.
- **Client IP Trust**: The real IP is taken from a proxy header only when `TRUSTED_IP_HEADER` is set. Otherwise a spoofable header is never trusted, to stop per-request IP spoofing from defeating the limiter.
- **Input Validation**: All API bodies are validated with Zod schemas (length and count bounds on every field).
- **Prompt-Injection Defense**: User input is sanitized (angle brackets encoded) and fenced inside `<untrusted_*>` XML delimiters.
- **Error Hygiene**: API routes return generic error messages in production; full detail stays in server logs. Upstream payloads are logged as length fingerprints only.
- **URL Safety**: Affiliate links are restricted to http/https both server-side (Zod) and at render time (`safeHttpUrl`), blocking `javascript:`/`data:` in `href` sinks.
- **Server-Only Keys**: AI provider credentials are server-only and never exposed to the browser. Only `NEXT_PUBLIC_*` branding values reach the client.
- **Security Headers**: HSTS, CSP (with `frame-ancestors 'none'`), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, and Permissions-Policy set in `next.config.ts`; `X-Powered-By` disabled.
- **Token Storage**: Social access and refresh tokens are encrypted with AES-256-GCM before they reach the database and are never sent to the browser.
- **Local Data**: Locale and theme preferences live in `localStorage`. Thread content is stored in Supabase, not in the browser.

---

## 💡 Usage Workflow

1. **Enter Topic or Pick a Suggestion**: Describe your topic manually, or pick one of the suggested topics (local pool + AI-fetched trending ideas) and shuffle for more.
2. **Customize**: Choose format (single tweet or thread length), writing style, tone, language, audience, content goal, and optional hooks/CTAs/emojis/hashtags.
3. **Affiliate Mode (optional)**: Fill in the product name, affiliate URL, price, key points, story angle, and disclosure tag to generate an authentic affiliate story.
4. **Generate**: Click generate to produce 1–5 distinct thread versions simultaneously.
5. **Refine**:
   - Manually edit any tweet in real time.
   - Regenerate individual tweets or transform the overall style/tone.
   - Adjust character length to fit X/Twitter formatting.
6. **Copy, Save, or Publish**: Copy formatted text, save the thread to your library, publish it to a connected Threads account, or schedule it for later.
7. **Library Management**: From the Saved page, filter/search, load a thread back into the Studio, delete, import, or export as JSON or TXT.

---

## �,�️ Status & Roadmap

The app is moving from a single-platform thread generator to a multi-account social media manager. Decisions and the target data model are recorded in `docs/adr/`, `docs/schema-v2.md`, and `docs/migration-plan.md`.

Current scope:

- Live: AI generation, library with server-side search and pagination, Google sign-in, Threads connect, publish, schedule, calendar, queue, notifications, media library, analytics snapshots, workspaces, Postgres queue, plan quotas, and Pakasir billing.
- MVP next: soft launch.
- Later: Instagram, Facebook Pages, Pinterest, TikTok, and team features.

Platform limits and review requirements are tracked in `docs/platform-integrations.md`. Plans and limits are in `docs/pricing.md`.

---

## 📄 License

MIT License , Feel free to use for personal or commercial projects.
