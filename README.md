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
- **Affiliate Storytelling**: Paste a product URL (Shopee, Tokopedia, TikTok, etc.) and let AI resolve the product metadata, then craft an authentic story around it with 5 story angles, 2 CTA placements, and a disclosure tag.
- **Interactive Editing Studio**:
  - **Inline Editing**: Edit any tweet directly in the preview card with real-time character count.
  - **Single Tweet Regeneration**: Regenerate only a specific tweet while preserving the rest of the thread.
  - **Transform Style & Tone**: Re-tone and adapt existing threads on the fly using AI.
  - **Adjust Length**: Shorten or lengthen individual tweets with one click.
- **Inspiration Prompts**: One-click prompt starters covering Technical Tips, Industry Insights, Case Studies, and Short Tutorials.
- **Bilingual Content**: Generate content in Bahasa Indonesia or English.
- **Bilingual UI (i18n)**: Language switcher for English and Bahasa Indonesia with persistent preferences.
- **Dark & Light Mode**: Theme toggling with automatic system preference detection via `next-themes`.
- **Private Browser Storage**: Save, search, filter, import, and manage threads locally via `localStorage` (no external database required).
- **Export & Copy**: One-click formatted copying ready for X/Twitter, plus export to JSON or TXT.
- **Built-in Security**: Middleware origin checks, per-endpoint IP rate limiting, SSRF protection on URL resolution, Zod request validation, and hardened security headers.

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
   # OpenAI-compatible API Configuration
   OPENAI_API_ENDPOINT=https://api.9router.com/v1
   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL_NAME=gpt-4o-mini

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
│   │   ├── affiliate/
│   │   │   └── resolve/route.ts        # Resolve affiliate product metadata from a URL
│   │   ├── generate/route.ts           # Main generation endpoint
│   │   ├── regenerate-tweet/route.ts   # Single tweet regeneration
│   │   ├── transform/route.ts          # Style/tone transformation
│   │   └── adjust-length/route.ts      # Shorten/lengthen tweet
│   ├── history/
│   │   └── page.tsx                    # Saved threads library, search, import & export
│   ├── globals.css
│   ├── layout.tsx                      # Root layout with Theme & i18n providers
│   └── page.tsx                        # Main Studio generator page
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
│   │   ├── InspirationPrompts.tsx
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
│   └── ai-provider.ts                 # AI provider configuration & validation
├── hooks/
│   ├── use-toast.ts
│   └── useLocalStorage.ts
├── lib/
│   ├── affiliate/
│   │   └── scraper.ts                 # Affiliate product metadata scraper
│   ├── ai/
│   │   ├── client.ts                  # AI API client wrapper
│   │   └── prompts.ts                 # Prompt engineering system
│   ├── i18n/                          # Internationalization dictionaries
│   │   ├── en.ts
│   │   ├── id.ts
│   │   ├── index.tsx
│   │   └── types.ts
│   ├── security/
│   │   ├── rateLimit.ts               # In-memory sliding-window IP rate limiter
│   │   └── ssrf.ts                    # SSRF guard for outbound URL resolution
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
| `OPENAI_API_KEY` | Your API key | `sk-xxx` |
| `OPENAI_API_ENDPOINT` | API endpoint URL (OpenAI-compatible) | `https://api.9router.com/v1` |
| `OPENAI_MODEL_NAME` | Model to use | `gpt-4o-mini` |
| `NEXT_PUBLIC_APP_NAME` | App display name | `Threvo` |
| `NEXT_PUBLIC_APP_TAGLINE` | App tagline | `Turn your thoughts into threads.` |
| `NEXT_PUBLIC_APP_DESCRIPTION` | App meta description | `Threvo turns your ideas into...` |
| `NEXT_PUBLIC_APP_SHORT_DESCRIPTION` | Short app description | `A simple way to turn ideas into...` |
| `NEXT_PUBLIC_MAX_THREADS_STORAGE` | Max threads stored locally | `100` |

---

## 🔌 Supported API Providers

This app works with any OpenAI-compatible API provider:

- **9router**: Configured by default (`https://api.9router.com/v1`)
- **OpenRouter**: Set endpoint to `https://openrouter.ai/api/v1`
- **OpenAI**: Set endpoint to `https://api.openai.com/v1`
- **Groq**: Set endpoint to `https://api.groq.com/openai/v1`

---

## 🔒 Security

- **Middleware**: Validates request origin and applies rate limiting to `/api/*` routes.
- **Rate Limiting**: In-memory sliding-window limiter per IP — `/api/generate` 5 req/min; `transform`, `adjust-length`, and `regenerate-tweet` 10 req/min; `/api/affiliate/resolve` 15 req/min.
- **SSRF Protection**: Outbound URL resolution blocks localhost, private/internal IPs, and metadata endpoints.
- **Input Validation**: All API bodies are validated with Zod schemas.
- **Prompt-Injection Defense**: User input is sanitized and fenced inside XML delimiters.
- **Security Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy set in `next.config.ts`.

---

## 💡 Usage Workflow

1. **Enter Topic or Choose Inspiration**: Describe your topic or click one of the curated inspiration prompt starters.
2. **Customize**: Choose format (single tweet or thread length), writing style, tone, audience, content goal, and optional hooks/CTAs/emojis/hashtags.
3. **Affiliate Mode (optional)**: Paste a product URL to auto-resolve metadata and generate an authentic affiliate story.
4. **Generate**: Click generate to produce 1–5 distinct thread versions simultaneously.
5. **Refine**:
   - Manually edit any tweet in real time.
   - Regenerate individual tweets or transform the overall style/tone.
   - Adjust character length to fit X/Twitter formatting.
6. **Copy & Save**: Copy formatted text with one click, or save the thread to your local library.
7. **Library Management**: Filter, search, import, delete, or export your saved threads as JSON or TXT from the History page.

---

## 📄 License

MIT License — Feel free to use for personal or commercial projects.
