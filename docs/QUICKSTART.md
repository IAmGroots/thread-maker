# 🚀 Quick Start Guide - Thread Maker

## Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm
- API key from an OpenAI-compatible provider (9router, OpenRouter, etc.)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API credentials:

```env
# Required
OPENAI_API_KEY=your_api_key_here
OPENAI_API_ENDPOINT=https://api.9router.com/v1
OPENAI_MODEL_NAME=gpt-4o-mini

# Optional
NEXT_PUBLIC_APP_NAME=Thread Maker
NEXT_PUBLIC_MAX_THREADS_STORAGE=100
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Provider Setup

### Using 9router (Default)

```env
OPENAI_API_KEY=your_9router_key
OPENAI_API_ENDPOINT=https://api.9router.com/v1
OPENAI_MODEL_NAME=gpt-4o-mini
```

### Using OpenRouter

```env
OPENAI_API_KEY=your_openrouter_key
OPENAI_API_ENDPOINT=https://openrouter.ai/api/v1
OPENAI_MODEL_NAME=openai/gpt-4o-mini
```

### Using OpenAI Directly

```env
OPENAI_API_KEY=sk-your_openai_key
OPENAI_API_ENDPOINT=https://api.openai.com/v1
OPENAI_MODEL_NAME=gpt-4o-mini
```

### Using Groq (Free & Fast)

```env
OPENAI_API_KEY=your_groq_key
OPENAI_API_ENDPOINT=https://api.groq.com/openai/v1
OPENAI_MODEL_NAME=llama-3.1-70b-versatile
```

## Usage Guide

### 1. Generate a Thread

1. **Enter your topic** in the text area
2. **Select style & tone** (e.g., Casual + Friendly)
3. **Configure advanced options** (optional):
   - Number of tweets (1-25)
   - Number of versions (1-5)
   - Language, target audience, content goal
   - Enable/disable hook, CTA, emojis, hashtags
4. **Click "Generate Thread"**

### 2. Review & Edit

- **View multiple versions** using the version tabs
- **Edit any tweet** by clicking the Edit button
- **Regenerate** specific tweets or the entire thread
- **Copy** individual tweets or the full thread

### 3. Save & Export

- **Save to local storage** for later access
- **Copy to clipboard** ready for X/Twitter
- **View history** of all saved threads
- **Export** as JSON or TXT

## Features Overview

### ✨ Core Features

- AI-powered tweet & thread generation
- 15+ customization options
- Multi-version generation (1-5 at once)
- Edit, regenerate, transform content
- Local storage (no database needed)
- Copy-paste ready for X/Twitter

### 🎨 Customization Options

- **Styles**: Professional, Casual, Storytelling, Educational, Humorous, Controversial, Persuasive, Inspirational, News
- **Tones**: Friendly, Confident, Witty, Authoritative, Emotional, Casual, Formal, Sarcastic
- **Languages**: Indonesian, English
- **Goals**: Engagement, Personal Branding, Education, Promotion, Follower Growth
- **Length**: Short (150-200), Medium (200-250), Long (250-280) chars

### 🛠️ Advanced Features

- Strong hooks for first tweet
- Call-to-action in final tweet
- Emoji integration
- Custom hashtags
- Character count validation
- Twitter URL handling

## Troubleshooting

### "Failed to generate content"

- Check your API key in `.env.local`
- Verify the API endpoint is correct
- Ensure you have API credits/quota remaining

### "Module not found" errors

- Run `npm install` to ensure all dependencies are installed
- Delete `node_modules` and `.next` folders, then run `npm install` again

### TypeScript errors

- Run `npm run build` to check for compilation errors
- Ensure all Shadcn UI components are properly installed

### No threads showing in history

- Threads are saved in browser localStorage
- Clear cache might have removed them
- Try saving a new thread to test

## Building for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Project Structure

```
threads-maker/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── history/           # History page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── generator/         # Form components
│   ├── results/           # Display components
│   └── ui/                # Shadcn UI components
├── lib/                   # Core utilities
│   ├── ai/               # AI client & prompts
│   ├── storage/          # LocalStorage helpers
│   └── utils.ts          # General utilities
├── types/                 # TypeScript types
├── hooks/                 # Custom React hooks
└── config/                # Configuration files
```

## Tips for Best Results

### Writing Topics

- Be specific and clear
- Include context when needed
- Example: "5 productivity tips for remote developers" vs "productivity tips"

### Choosing Style & Tone

- Match your audience and platform
- Casual + Friendly works well for general engagement
- Professional + Confident for business content
- Storytelling + Emotional for personal narratives

### Using Hooks & CTAs

- Enable hooks for better engagement
- Add CTA to drive specific actions
- Examples: "Like if you agree", "Follow for more", "What's your take?"

### Emojis & Hashtags

- Emojis increase engagement but don't overuse
- Use 1-3 relevant hashtags maximum
- Custom hashtags for branded campaigns

## Support & Resources

- **GitHub Issues**: Report bugs or request features
- **Documentation**: See [README.md](../README.md) for full documentation
- **Architecture**: See [plans/threads-maker-architecture.md](../plans/threads-maker-architecture.md)

## License

MIT License - Free to use for personal and commercial projects.

---

**Built with ❤️ using Next.js, TypeScript, and AI**
