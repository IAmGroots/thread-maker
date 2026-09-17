# Thread Maker - AI Tweet & Thread Generator

Generate viral tweets and threads with AI. Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI, and OpenAI-compatible APIs.

---

## 🚀 Key Features

- **AI-Powered Generation**: Create engaging single tweets or structured threads (1–25 tweets) with 1–5 versions simultaneously.
- **Deep Customization**:
  - **9 Writing Styles**: Professional, Casual, Storytelling, Educational, Humorous, Controversial, Persuasive, Inspirational, News.
  - **8 Tones**: Friendly, Confident, Witty, Authoritative, Emotional, Casual, Formal, Sarcastic.
  - **Audience & Goals**: Target specific audiences and define content objectives.
  - **Granular Controls**: Toggle Hooks, Call-to-Actions (CTA), emojis, automatic hashtags, and custom hashtags.
  - **Length Presets**: Short (150–200), Medium (200–250), or Long (250–280) characters.
- **Interactive Editing Studio**:
  - **Inline Editing**: Edit any tweet directly in the preview card with real-time character count.
  - **Single Tweet Regeneration**: Regenerate only a specific tweet while preserving the rest of the thread.
  - **Transform Style & Tone**: Re-tone and adapt existing threads on the fly using AI.
  - **Adjust Length**: Shorten or lengthen individual tweets with one click.
- **Inspiration Prompts**: One-click prompt starters covering Tech & AI, Productivity, Storytelling, and more.
- **Bilingual UI (i18n)**: Seamless language switcher for English and Bahasa Indonesia with persistent preferences.
- **Dark & Light Mode**: Theme toggling with automatic system preference detection via `next-themes`.
- **Private Browser Storage**: Save, search, filter, and manage threads locally via `localStorage` (no external database required).
- **Export & Copy**: One-click formatted copying ready for X/Twitter, plus export to JSON or TXT.
- **Built-in Security & Rate Limiting**: In-memory rate limiter to protect your API quota from abuse.

---

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm, yarn, or pnpm
- API key from 9router, OpenAI, Groq, or OpenRouter

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
   OPENAI_API_KEY=your_api_key_here
   OPENAI_API_ENDPOINT=https://api.9router.com/v1
   OPENAI_MODEL_NAME=gpt-4o-mini
   NEXT_PUBLIC_APP_NAME=Thread Maker
   NEXT_PUBLIC_MAX_THREADS_STORAGE=100
   ```

3. **Run development server**

   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 📁 Project Structure

```text
threads-maker/
├── app/
│   ├── api/
│   │   ├── generate/route.ts          # Main generation endpoint
│   │   ├── regenerate-tweet/route.ts  # Single tweet regeneration
│   │   ├── transform/route.ts         # Style/tone transformation
│   │   └── adjust-length/route.ts     # Shorten/lengthen tweet
│   ├── history/
│   │   └── page.tsx                   # Saved threads library & search
│   ├── globals.css
│   ├── layout.tsx                     # Root layout with Theme & i18n providers
│   └── page.tsx                       # Main Studio generator page
├── components/
│   ├── generator/                     # Form & customization inputs
│   │   ├── AdvancedOptions.tsx
│   │   ├── CustomizationPanel.tsx
│   │   ├── StyleSelector.tsx
│   │   ├── ToneSelector.tsx
│   │   └── TopicInput.tsx
│   ├── results/                       # Tweet preview & editing cards
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
│   ├── ai/
│   │   ├── client.ts                  # AI API client wrapper
│   │   └── prompts.ts                 # Prompt engineering system
│   ├── i18n/                          # Internationalization dictionaries
│   │   ├── en.ts
│   │   ├── id.ts
│   │   ├── index.tsx
│   │   └── types.ts
│   ├── security/
│   │   └── rateLimit.ts               # In-memory IP rate limiter
│   ├── storage/
│   │   └── localStorage.ts            # LocalStorage operations & exports
│   └── utils.ts                       # Helper utilities
├── types/
│   ├── generator.ts                   # Generator configuration types
│   ├── storage.ts                     # Storage schemas
│   └── thread.ts                      # Tweet and thread interfaces
├── .env.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔧 Environment Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | Your API key | `sk-xxx` |
| `OPENAI_API_ENDPOINT` | API endpoint URL | `https://api.9router.com/v1` |
| `OPENAI_MODEL_NAME` | Model to use | `gpt-4o-mini` |
| `NEXT_PUBLIC_APP_NAME` | App display name | `Thread Maker` |
| `NEXT_PUBLIC_MAX_THREADS_STORAGE` | Max threads stored locally | `100` |

---

## 🔌 Supported API Providers

This app works with any OpenAI-compatible API provider:

- **9router**: Configured by default (`https://api.9router.com/v1`)
- **OpenRouter**: Set endpoint to `https://openrouter.ai/api/v1`
- **OpenAI**: Set endpoint to `https://api.openai.com/v1`
- **Groq**: Set endpoint to `https://api.groq.com/openai/v1`

---

## 💡 Usage Workflow

1. **Enter Topic or Choose Inspiration**: Describe your topic or click one of the curated inspiration prompt starters.
2. **Customize**: Choose format (single tweet or thread length), writing style, tone, audience, goals, and optional hooks/CTAs.
3. **Generate**: Click generate to produce 1–5 distinct thread versions simultaneously.
4. **Refine**:
   - Manually edit any tweet in real time.
   - Regenerate individual tweets or transform the overall style/tone.
   - Adjust character length to fit X/Twitter formatting.
5. **Copy & Save**: Copy formatted text with one click, or save the thread to your local library.
6. **Library Management**: Filter, search, delete, or export your saved threads as JSON or TXT from the History page.

---

## 📄 License

MIT License - Feel free to use for personal or commercial projects.
