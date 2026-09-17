import { TranslationDictionary } from "./types";

export const en: TranslationDictionary = {
  common: {
    chars: "characters",
    charsEntered: (count: number) => `${count} characters entered`,
    tweets: (count: number) => `${count} tweet${count > 1 ? "s" : ""}`,
    singleTweet: "Single Tweet",
    thread: "Thread",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    copy: "Copy",
    regen: "Regen",
    export: "Export",
    add: "Add",
    show: "Show",
    hide: "Hide",
    close: "Close",
    apply: "Apply",
  },
  header: {
    generator: "Generator",
    savedLibrary: "Library",
    savedLibraryShort: "Library",
    navAria: "Main Navigation",
    themeToggle: "Toggle theme",
    languageSwitch: "Switch language",
    languageName: "English",
  },
  composer: {
    title: "Your style. Your tone. Your thread.",
    subtitle:
      "Draft and customize multi-tweet threads with structured style, tone, and length parameters.",
    topicLabel: "What do you want to tweet about?",
    topicPlaceholder:
      "Enter your topic or idea here...\ne.g., 'Tips to improve developer productivity' or 'The future of artificial intelligence in everyday life'",
    topicDescription:
      "Be specific and clear about your topic. The generator will create structured content based on this guidance.",
    topicErrorRequired: "Please enter a topic",
    toneAndStyle: "Tone & Style",
    writingStyle: "Writing Style",
    writingStylePlaceholder: "Select writing style",
    tone: "Tone",
    tonePlaceholder: "Select tone",
    advancedOptions: "Advanced Options",
    composeButton: "Compose Thread",
    composingButton: "Composing Thread...",
    parameters: "Parameters",
    contentLanguage: "Content Language",
    contentGoal: "Content Goal",
    targetAudience: "Target Audience",
    targetAudiencePlaceholder: "e.g., Developers, Students, Entrepreneurs",
    tweetLength: "Tweet Length",
    numberOfTweets: "Number of Tweets",
    singleTweetDesc: "Single tweet",
    threadWithTweetsDesc: (count: number) => `Thread with ${count} tweets`,
    generateVersions: "Generate Versions",
    versionAria: (count: number) => `${count} version${count > 1 ? "s" : ""}`,
    versionsDesc: (count: number) =>
      `Generate ${count} different version${count > 1 ? "s" : ""} to choose from`,
    contentOptions: "Content Options",
    useHook: "Use Hook",
    useHookDesc: "Start with an attention-grabbing opening sentence",
    useCTA: "Add CTA",
    useCTADesc: "Conclude with a clear call-to-action",
    includeEmojis: "Include Emojis",
    includeEmojisDesc: "Add relevant emojis to support tweet engagement",
    includeHashtags: "Include Hashtags",
    includeHashtagsDesc: "Add hashtags to enhance discoverability",
    customHashtags: "Custom Hashtags (Optional)",
    customHashtagsPlaceholder: "Add hashtag (without #)",
  },
  options: {
    styles: {
      professional: "Professional",
      casual: "Casual",
      storytelling: "Storytelling",
      educational: "Educational",
      humorous: "Humorous",
      controversial: "Controversial",
      persuasive: "Persuasive",
      inspirational: "Inspirational",
      news: "News-style",
    },
    tones: {
      friendly: "Friendly",
      confident: "Confident",
      witty: "Witty",
      authoritative: "Authoritative",
      emotional: "Emotional",
      casual: "Casual",
      formal: "Formal",
      sarcastic: "Sarcastic",
    },
    goals: {
      engagement: "Engagement",
      "personal-branding": "Personal Branding",
      education: "Education",
      promotion: "Promotion",
      "follower-growth": "Follower Growth",
    },
    languages: {
      id: "Bahasa Indonesia",
      en: "English",
      both: "Multilingual",
    },
    lengths: {
      short: "Short",
      medium: "Medium",
      long: "Long",
    },
  },
  prompts: {
    heading: "Draft a New Thread",
    description:
      "Select a starter topic below or enter your own in the composer to begin.",
    suggestedTopics: "Suggested Topics",
    items: [
      {
        category: "Technical Tips",
        topic:
          "5 clean code practices every junior engineer should adopt in their first year",
      },
      {
        category: "Industry Insights",
        topic:
          "Why modern software architecture is shifting back towards modular monoliths",
      },
      {
        category: "Case Studies",
        topic:
          "How a 3-person engineering team scaled a web app to 50,000 active users",
      },
      {
        category: "Short Tutorials",
        topic:
          "Step-by-step guide to setting up automated accessibility checks in your build pipeline",
      },
    ],
  },
  skeleton: {
    status: "Composing thread...",
    description: "Drafting tweets based on your topic and parameters",
    srOnly: "Composing your thread, please wait.",
  },
  results: {
    generatedThread: "Generated Thread",
    topic: "Topic",
    summary: (tweets: number, chars: number) =>
      `${tweets} tweet${tweets > 1 ? "s" : ""} • ${chars} characters`,
    version: (version: number) => `Version ${version}`,
    copyAll: "Copy All",
    save: "Save",
    regenerate: "Regenerate",
    transform: "Transform",
    shorten: "Shorten",
    lengthen: "Lengthen",
    export: "Export",
    editTweetAria: (n: number) => `Edit content for tweet ${n}`,
    saveTweetAria: (n: number) => `Save changes for tweet ${n}`,
    cancelTweetAria: (n: number) => `Cancel editing tweet ${n}`,
    editAria: (n: number) => `Edit tweet ${n}`,
    regenAria: (n: number) => `Regenerate tweet ${n}`,
    copyAria: (n: number) => `Copy tweet ${n}`,
    adjustLengthAria: (n: number) => `Adjust length for tweet ${n}`,
    tweetOrderAria: (order: number, total: number) =>
      `Tweet ${order} of ${total}`,
    charCountAria: (
      count: number,
      max: number,
      status: "normal" | "approaching" | "over",
    ) => {
      if (status === "over") {
        return `${count} of ${max} characters, limit exceeded`;
      }
      if (status === "approaching") {
        return `${count} of ${max} characters, approaching limit`;
      }
      return `${count} of ${max} characters`;
    },
  },
  transform: {
    dialogTitle: "Transform Thread",
    dialogDesc:
      "Rewrite this thread with a different writing style or tone while keeping its core points.",
    targetStyle: "Target Style",
    targetTone: "Target Tone",
    apply: "Apply Transformation",
    processing: "Transforming Thread...",
  },
  adjustLength: {
    dialogTitle: "Adjust Tweet Length",
    dialogDesc:
      "Optimize tweet length by making it more concise or expanding the thought.",
    selectTweet: "Select Tweet",
    selectTweetLabel: (index: number) => `Tweet ${index + 1}`,
    direction: "Adjustment Goal",
    shorten: "Shorten",
    shortenDesc: "Make this tweet more concise and direct.",
    lengthen: "Lengthen",
    lengthenDesc: "Give this tweet more room to elaborate on the idea.",
    apply: "Apply Adjustment",
    processing: "Adjusting Length...",
  },
  history: {
    title: "Library Threads",
    countSaved: (count: number) =>
      `${count} thread${count !== 1 ? "s" : ""} saved locally`,
    searchPlaceholder: "Search by topic, style, tone, or tweet content...",
    clearSearch: "Clear search query",
    deleteDialogTitle: "Delete Thread",
    deleteDialogDesc:
      "Are you sure you want to delete this thread? This action cannot be undone.",
    noThreadsYet: "No threads saved yet",
    createFirstThread: "Create Your First Thread",
    noThreadsMatch: "No threads match your search",
    copyThreadAria: "Copy thread to clipboard",
    deleteThreadAria: "Delete thread",
    loadToStudio: "Load to Studio",
    loadToStudioAria: "Load this thread into Composer",
    firstTweetPreview: "First Tweet Preview",
    exportJson: "Export JSON",
    exportTxt: "Export TXT",
  },
  toasts: {
    success: "Success",
    generatedSuccess: (count: number) =>
      `Generated ${count} version${count > 1 ? "s" : ""} of your thread.`,
    generationFailed: "Generation failed",
    saved: "Saved",
    savedDesc: "Thread saved to your local storage.",
    saveFailed: "Save failed",
    saveFailedDesc: "Failed to save thread. Please try again.",
    tweetUpdated: "Tweet updated",
    tweetUpdatedDesc: "Your changes have been saved.",
    regenerated: "Regenerated",
    regeneratedDesc: (index: number) =>
      `Tweet ${index + 1} has been regenerated.`,
    regenerationFailed: "Regeneration failed",
    transformSuccess: "Thread transformed with new tone and style.",
    transformFailed: "Failed to transform thread. Please try again.",
    adjustLengthSuccess: "Tweet length successfully adjusted.",
    adjustLengthFailed: "Failed to adjust tweet length. Please try again.",
    loadedToStudio: "Loaded to Studio",
    loadedToStudioDesc: "Thread content and settings loaded into the Composer.",
    copied: "Copied",
    threadCopiedDesc: "Thread copied to clipboard. Ready to post!",
    singleTweetCopiedDesc: (order: number) =>
      `Tweet ${order} copied to clipboard.`,
    copyFailed: "Failed to copy",
    copyFailedDesc: "Please try again or copy manually.",
    deleted: "Deleted",
    deletedDesc: "Thread has been deleted.",
    exported: "Exported",
    exportedJsonDesc: "Threads exported as JSON.",
    exportedTxtDesc: "Threads exported as TXT.",
  },
};
