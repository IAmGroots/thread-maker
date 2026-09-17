# Thread Maker - AI Tweet & Thread Generator

Generate viral tweets and threads with AI. Built with Next.js, TypeScript, Shadcn UI, and OpenAI-compatible API.

## 🚀 Features

- **AI-Powered Generation**: Generate engaging tweets and threads using OpenAI-compatible APIs
- **Full Customization**:
  - Choose format (single tweet or thread with 1-25 tweets)
  - Select from 9 writing styles (professional, casual, storytelling, etc.)
  - Pick from 8 tones (friendly, confident, witty, etc.)
  - Set target audience and content goals
  - Control length, emojis, hashtags, hooks, and CTAs
- **Multiple Versions**: Generate 1-5 versions at once
- **Edit & Regenerate**:
  - Edit tweets manually
  - Regenerate entire threads or individual tweets
  - Transform style/tone
  - Adjust length (shorten/lengthen)
- **Dark Mode**: Toggle between light and dark themes with system preference support
- **Local Storage**: All threads saved locally in browser (no database needed)
- **History & Export**: View, filter, search, and export your threads
- **Copy to Clipboard**: One-click copy formatted for X/Twitter

## 📋 Current Progress

### ✅ Completed (Phase 1-3)

1. **Project Setup**
   - ✅ Next.js 15 with TypeScript
   - ✅ Tailwind CSS configuration
   - ✅ Shadcn UI components installed
   - ✅ Project structure created

2. **Type Definitions**
   - ✅ [`types/thread.ts`](types/thread.ts) - Tweet and thread interfaces
   - ✅ [`types/generator.ts`](types/generator.ts) - Generator configuration types
   - ✅ [`types/storage.ts`](types/storage.ts) - LocalStorage types

3. **Core Libraries**
   - ✅ [`lib/utils.ts`](lib/utils.ts) - Utility functions (cn, date formatting, char counting, etc.)
   - ✅ [`lib/storage/localStorage.ts`](lib/storage/localStorage.ts) - Complete localStorage system
   - ✅ [`lib/ai/client.ts`](lib/ai/client.ts) - OpenAI client wrapper
   - ✅ [`lib/ai/prompts.ts`](lib/ai/prompts.ts) - Prompt engineering system

4. **API Routes**
   - ✅ [`app/api/generate/route.ts`](app/api/generate/route.ts) - Main generation endpoint
   - ✅ [`app/api/adjust-length/route.ts`](app/api/adjust-length/route.ts) - Shorten/lengthen tweets
   - ✅ [`app/api/transform/route.ts`](app/api/transform/route.ts) - Change style/tone
   - ✅ [`app/api/regenerate-tweet/route.ts`](app/api/regenerate-tweet/route.ts) - Regenerate single tweet

5. **Configuration**
   - ✅ [`config/ai-provider.ts`](config/ai-provider.ts) - AI provider configuration
   - ✅ [`.env.example`](.env.example) - Environment variables template

6. **UI Components (Shadcn)**
   - ✅ Button, Input, Textarea, Select
   - ✅ Card, Badge, Dialog, Toast
   - ✅ Label, Slider, Tabs

### 🚧 To Be Implemented (Phase 4-5)

7. **Generator Components** (Next Priority)
   - [ ] `components/generator/TopicInput.tsx`
   - [ ] `components/generator/CustomizationPanel.tsx`
   - [ ] `components/generator/StyleSelector.tsx`
   - [ ] `components/generator/ToneSelector.tsx`
   - [ ] `components/generator/AdvancedOptions.tsx`

8. **Results Components**
   - [ ] `components/results/ThreadPreview.tsx`
   - [ ] `components/results/TweetCard.tsx`
   - [ ] `components/results/TweetActions.tsx`
   - [ ] `components/results/VersionTabs.tsx`

9. **History Components**
   - [ ] `components/history/HistoryList.tsx`
   - [ ] `components/history/HistoryItem.tsx`
   - [ ] `components/history/HistoryFilters.tsx`

10. **Pages**
    - [ ] Update `app/page.tsx` - Main generator page
    - [ ] Create `app/history/page.tsx` - History page

11. **Hooks**
    - [ ] `hooks/useLocalStorage.ts`
    - [ ] `hooks/useGenerator.ts`
    - [ ] `hooks/useClipboard.ts`

12. **Testing & Polish**
    - [ ] Test all features
    - [ ] Add error boundaries
    - [ ] Optimize performance
    - [ ] Add loading states
    - [ ] Write documentation

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm, yarn, or pnpm
- API key from 9router or other OpenAI-compatible provider

### Installation

1. **Clone or navigate to the project**

   ```bash
   cd threads-maker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   # Copy the example file
   cp .env.example .env.local

   # Edit .env.local and add your API credentials
   # OPENAI_API_KEY=your_api_key_here
   # OPENAI_API_ENDPOINT=https://api.9router.com/v1
   # OPENAI_MODEL_NAME=gpt-4o-mini
   ```

4. **Run development server**

   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
threads-maker/
├── app/
│   ├── api/
│   │   ├── generate/route.ts          # Main generation API
│   │   ├── adjust-length/route.ts     # Adjust tweet length
│   │   ├── transform/route.ts         # Transform style/tone
│   │   └── regenerate-tweet/route.ts  # Regenerate single tweet
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                            # Shadcn UI components
├── config/
│   └── ai-provider.ts                 # AI configuration
├── lib/
│   ├── ai/
│   │   ├── client.ts                  # OpenAI client
│   │   └── prompts.ts                 # Prompt engineering
│   ├── storage/
│   │   └── localStorage.ts            # Storage utilities
│   └── utils.ts                       # Helper functions
├── types/
│   ├── thread.ts                      # Thread types
│   ├── generator.ts                   # Generator types
│   └── storage.ts                     # Storage types
├── .env.example
├── .env.local                         # Your local config (gitignored)
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## 🔧 Environment Variables

| Variable                          | Description            | Example                           |
| --------------------------------- | ---------------------- | --------------------------------- |
| `OPENAI_API_KEY`                  | Your API key           | `sk-xxx` or provider-specific key |
| `OPENAI_API_ENDPOINT`             | API endpoint URL       | `https://api.9router.com/v1`      |
| `OPENAI_MODEL_NAME`               | Model to use           | `gpt-4o-mini`                     |
| `NEXT_PUBLIC_APP_NAME`            | App display name       | `Thread Maker`                    |
| `NEXT_PUBLIC_MAX_THREADS_STORAGE` | Max threads in storage | `100`                             |

## 💡 Usage (Once Complete)

1. **Enter Your Topic**: Describe what you want to tweet about
2. **Customize**: Choose format, style, tone, and other options
3. **Generate**: Click generate to create 1-5 versions
4. **Edit**: Manually edit any tweet or regenerate specific ones
5. **Transform**: Change the style or tone of existing threads
6. **Copy**: Copy formatted thread ready to post on X/Twitter
7. **Save**: Store threads locally in your browser
8. **History**: View and manage all your saved threads

## 🎨 Customization Options

- **Format**: Single Tweet, Thread (2-25 tweets)
- **Style**: Professional, Casual, Storytelling, Educational, Humorous, Controversial, Persuasive, Inspirational, News
- **Tone**: Friendly, Confident, Witty, Authoritative, Emotional, Casual, Formal, Sarcastic
- **Language**: Bahasa Indonesia, English
- **Length**: Short (150-200), Medium (200-250), Long (250-280) characters
- **Options**: Hook, CTA, Emojis, Hashtags

## 🔌 API Providers

This app works with any OpenAI-compatible API provider:

- **9router** - Configured by default
- **OpenRouter** - Change endpoint to `https://openrouter.ai/api/v1`
- **OpenAI** - Use `https://api.openai.com/v1`
- **Groq** - Use `https://api.groq.com/openai/v1`
- **Others** - Any provider with OpenAI-compatible API

## 🗂️ Data Storage

All data is stored locally in your browser using `localStorage`:

- No external database
- No data sent to servers (except AI API calls)
- Privacy-focused
- Portable (export/import JSON)

## 🚀 Deployment

Ready to deploy to:

- Vercel (recommended)
- Netlify
- Any Node.js hosting

Remember to set environment variables in your hosting platform.

## 📝 Next Steps for Development

1. **Implement UI Components**: Start with generator form components
2. **Build Main Page**: Integrate all components into the generator page
3. **Add History Page**: Create the history/library interface
4. **Implement Hooks**: Create custom React hooks for state management
5. **Test Everything**: Test all features end-to-end
6. **Polish UI/UX**: Add loading states, animations, error handling
7. **Documentation**: Complete user guide and API docs

## 📄 License

MIT License - Feel free to use for personal or commercial projects

## 🤝 Contributing

Contributions welcome! This is a great starter project for learning:

- Next.js App Router
- TypeScript
- Shadcn UI
- OpenAI API integration
- Browser storage APIs

---

**Built with ❤️ using Next.js, TypeScript, and Shadcn UI**
