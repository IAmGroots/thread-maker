# Threvo - AI Tweet & Thread Generator

Turn your thoughts into threads. Generate viral tweets and threads with AI. Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI, and any OpenAI-compatible API.

---

## 🚀 Key Features

- **AI-Powered Generation**: Create engaging single tweets or structured threads (1–25 tweets) with 1–5 versions simultaneously.
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
- **Private Browser Storage**: Save, search, filter, import, and manage threads locally via `localStorage` (no external database required).
- **Export & Copy**: One-click formatted copying ready for X/Twitter, plus export to JSON or TXT.
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
   # Multi-provider AI gateway (recommended) — SINGLE LINE JSON array.
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
│   │   └── suggest-topics/route.ts     # AI-generated trending topics
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
│   │   └── rateLimit.ts               # In-memory sliding-window IP rate limiter
│   ├── storage/
│   │   └── localStorage.ts            # LocalStorage operations & exports
│   ├── validations/                   # Zod request schemas
│   │   ├── affiliate.ts
│   │   └── generator.ts
│   └── utils.ts                       # Helper utilities
├── types/
│   ├── css.d.ts
│   ├── generator.ts                   # Generator configuration types
│   ├── storage.ts                     # Storage schemas
│   └── thread.ts                      # Tweet and thread interfaces
├── docs/
│   ├── PROJECT_COMPLETE.md
│   └── QUICKSTART.md
├── middleware.ts                      # Origin check + API rate limiting
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
| `NEXT_PUBLIC_MAX_THREADS_STORAGE` | Max threads stored locally | `100` |

---

## 🔌 Supported API Providers

This app works with any OpenAI-compatible API provider. Configure one or more via `OPENAI_PROVIDERS` (with automatic failover), or use the legacy single-provider variables:

- **9router**: `https://api.9router.com/v1`
- **OpenRouter**: `https://openrouter.ai/api/v1`
- **OpenAI**: `https://api.openai.com/v1`
- **Groq**: `https://api.groq.com/openai/v1`

> Note for cloud deploys (Vercel/Netlify): endpoints must be publicly reachable — a local router such as `http://localhost:20128/v1` will not work in the cloud.

---

## 🔒 Security

- **Middleware**: Validates request origin (method, `Sec-Fetch-Site`, Origin/Referer/host) and applies rate limiting to `/api/*` routes.
- **Rate Limiting**: In-memory sliding-window limiter per IP — `/api/generate` 5 req/min; `/api/suggest-topics` 5 req/min; `/api/transform`, `/api/adjust-length`, and `/api/regenerate-tweet` 10 req/min. Unlisted `/api/*` paths fail closed to 5 req/min. The limiter is per process, so on multi-instance/serverless deploys use a shared store for exact limits.
- **Client IP Trust**: The real IP is taken from a proxy header only when `TRUSTED_IP_HEADER` is set. Otherwise a spoofable header is never trusted, to stop per-request IP spoofing from defeating the limiter.
- **Input Validation**: All API bodies are validated with Zod schemas (length and count bounds on every field).
- **Prompt-Injection Defense**: User input is sanitized (angle brackets encoded) and fenced inside `<untrusted_*>` XML delimiters.
- **Error Hygiene**: API routes return generic error messages in production; full detail stays in server logs. Upstream payloads are logged as length fingerprints only.
- **URL Safety**: Affiliate links are restricted to http/https both server-side (Zod) and at render time (`safeHttpUrl`), blocking `javascript:`/`data:` in `href` sinks.
- **Server-Only Keys**: AI provider credentials are server-only and never exposed to the browser. Only `NEXT_PUBLIC_*` branding values reach the client.
- **Security Headers**: HSTS, CSP (with `frame-ancestors 'none'`), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, and Permissions-Policy set in `next.config.ts`; `X-Powered-By` disabled.
- **Local Data**: Saved threads live in the browser's `localStorage` (user-owned, plaintext). No auth tokens or secrets are stored there.

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
6. **Copy & Save**: Copy formatted text with one click, or save the thread to your local library.
7. **Library Management**: From the Saved page, filter/search, load a thread back into the Studio, delete, import, or export as JSON or TXT.

---

## 📄 License

MIT License — Feel free to use for personal or commercial projects.
