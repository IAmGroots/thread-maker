import {
  SavedThread,
  Tweet,
  WritingStyle,
  Tone,
  Language,
  ContentGoal,
} from "@/types/thread";
import { STORAGE_KEYS, LocalStorageData, StorageConfig } from "@/types/storage";
import {
  generateId,
  countTwitterChars,
  hasEmojis,
  extractHashtags,
} from "@/lib/utils";

const STORAGE_VERSION = "1.0.0";
const DEFAULT_MAX_THREADS = 100;

// Initialize storage
function initStorage(): void {
  if (typeof window === "undefined") return;

  const existing = localStorage.getItem(STORAGE_KEYS.THREADS);
  if (!existing) {
    const initialData: LocalStorageData = {
      threads: [],
      lastUpdated: new Date().toISOString(),
      version: STORAGE_VERSION,
    };
    localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(initialData));
  }
}

// Get all threads
export function getThreads(): SavedThread[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEYS.THREADS);
    if (!data) {
      initStorage();
      return [];
    }

    const parsed: LocalStorageData = JSON.parse(data);
    return parsed.threads || [];
  } catch (error) {
    console.error("Error reading threads from localStorage:", error);
    return [];
  }
}

// Save a new thread
export function saveThread(thread: SavedThread): boolean {
  if (typeof window === "undefined") return false;

  try {
    const existing = getThreads();

    // Check if we've reached the limit
    const maxThreads = parseInt(
      process.env.NEXT_PUBLIC_MAX_THREADS_STORAGE ||
        String(DEFAULT_MAX_THREADS),
    );

    if (existing.length >= maxThreads) {
      // Remove the oldest thread
      existing.shift();
    }

    existing.push(thread);

    const data: LocalStorageData = {
      threads: existing,
      lastUpdated: new Date().toISOString(),
      version: STORAGE_VERSION,
    };

    localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error saving thread to localStorage:", error);
    return false;
  }
}

// Update an existing thread
export function updateThread(
  threadId: string,
  updates: Partial<SavedThread>,
): boolean {
  if (typeof window === "undefined") return false;

  try {
    const existing = getThreads();
    const index = existing.findIndex((t) => t.metadata.id === threadId);

    if (index === -1) return false;

    existing[index] = {
      ...existing[index],
      ...updates,
      metadata: {
        ...existing[index].metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    const data: LocalStorageData = {
      threads: existing,
      lastUpdated: new Date().toISOString(),
      version: STORAGE_VERSION,
    };

    localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error updating thread in localStorage:", error);
    return false;
  }
}

// Delete a thread
export function deleteThread(threadId: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const existing = getThreads();
    const filtered = existing.filter((t) => t.metadata.id !== threadId);

    const data: LocalStorageData = {
      threads: filtered,
      lastUpdated: new Date().toISOString(),
      version: STORAGE_VERSION,
    };

    localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error deleting thread from localStorage:", error);
    return false;
  }
}

// Get a single thread by ID
export function getThreadById(threadId: string): SavedThread | null {
  const threads = getThreads();
  return threads.find((t) => t.metadata.id === threadId) || null;
}

// Clear all threads (use with caution)
export function clearAllThreads(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const data: LocalStorageData = {
      threads: [],
      lastUpdated: new Date().toISOString(),
      version: STORAGE_VERSION,
    };

    localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error clearing threads from localStorage:", error);
    return false;
  }
}

// Helper to convert topic to filename slug
export function slugifyTopic(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "thread"
  );
}

// Export single thread to TXT format with complete content and metadata
export function exportSingleThreadToTXT(thread: SavedThread): string {
  let output = `==================================================\n`;
  output += `THREAD: ${thread.metadata.topic}\n`;
  output += `Dibuat: ${thread.metadata.createdAt}\n`;
  output += `Format: ${thread.metadata.format === "single" ? "Single Tweet" : `Thread (${thread.totalTweets} Tweets)`}\n`;
  output += `Gaya: ${thread.metadata.style} | Nada: ${thread.metadata.tone} | Bahasa: ${thread.metadata.language}\n`;
  output += `Total: ${thread.totalTweets} Tweet | ${thread.totalChars} Karakter\n`;
  output += `==================================================\n\n`;

  thread.tweets.forEach((tweet, idx) => {
    output += `[${tweet.order || idx + 1}/${thread.totalTweets}]\n`;
    output += `${tweet.content}\n\n`;
    if (idx < thread.tweets.length - 1) {
      output += `---\n\n`;
    }
  });

  output += `==================================================\n`;
  return output;
}

// Export single thread to JSON format with complete content and metadata
export function exportSingleThreadToJSON(thread: SavedThread): string {
  return JSON.stringify(thread, null, 2);
}

// Export threads to JSON (accepts optional filtered list, defaults to all)
export function exportToJSON(threadsList?: SavedThread[]): string {
  const threads = threadsList || getThreads();
  return JSON.stringify(threads, null, 2);
}

// Export threads to TXT format with complete content (accepts optional filtered list, defaults to all)
export function exportToTXT(threadsList?: SavedThread[]): string {
  const threads = threadsList || getThreads();
  let output = "";

  threads.forEach((thread, index) => {
    output += `==================================================\n`;
    output += `THREAD ${index + 1}: ${thread.metadata.topic}\n`;
    output += `Dibuat: ${thread.metadata.createdAt}\n`;
    output += `Format: ${thread.metadata.format === "single" ? "Single Tweet" : `Thread (${thread.totalTweets} Tweets)`}\n`;
    output += `Gaya: ${thread.metadata.style} | Nada: ${thread.metadata.tone} | Bahasa: ${thread.metadata.language}\n`;
    output += `Total: ${thread.totalTweets} Tweet (${thread.totalChars} Karakter)\n`;
    output += `==================================================\n\n`;

    thread.tweets.forEach((tweet, tIdx) => {
      output += `[${tweet.order || tIdx + 1}/${thread.totalTweets}]\n`;
      output += `${tweet.content}\n\n`;
      if (tIdx < thread.tweets.length - 1) {
        output += `---\n\n`;
      }
    });

    output += `\n\n`;
  });

  return output;
}

// Helper to normalize raw tweet array/objects to structured Tweet[]
function normalizeTweets(rawTweets: unknown[]): Tweet[] {
  return rawTweets
    .map((item, idx) => {
      let content = "";
      let order = idx + 1;

      if (typeof item === "string") {
        content = item.trim();
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        content = String(obj.content || obj.text || obj.tweet || "").trim();
        if (typeof obj.order === "number") {
          order = obj.order;
        }
      }

      if (!content) return null;

      return {
        id: generateId(),
        content,
        order,
        charCount: countTwitterChars(content),
        hasEmoji: hasEmojis(content),
        hashtags: extractHashtags(content),
      };
    })
    .filter((t): t is Tweet => t !== null)
    .sort((a, b) => a.order - b.order);
}

// Normalize imported parsed JSON to SavedThread[]
function normalizeImportedJSON(parsed: unknown): SavedThread[] {
  if (!parsed) return [];

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.threads)) {
      rawList = obj.threads;
    } else if (Array.isArray(obj.data)) {
      rawList = obj.data;
    } else if (Array.isArray(obj.tweets)) {
      rawList = [obj];
    } else {
      rawList = [obj];
    }
  }

  const results: SavedThread[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;

    let rawTweets: unknown[] = [];
    if (Array.isArray(obj.tweets)) {
      rawTweets = obj.tweets;
    } else if (Array.isArray(obj.thread)) {
      rawTweets = obj.thread;
    }

    const tweets = normalizeTweets(rawTweets);
    if (tweets.length === 0) continue;

    const totalChars = tweets.reduce((acc, t) => acc + t.charCount, 0);
    const meta = (obj.metadata && typeof obj.metadata === "object"
      ? (obj.metadata as Record<string, unknown>)
      : {}) as Record<string, unknown>;

    const topic =
      String(meta.topic || obj.topic || obj.title || "").trim() ||
      tweets[0].content.slice(0, 50).replace(/\n/g, " ");

    const format =
      (meta.format as "single" | "thread") ||
      (tweets.length === 1 ? "single" : "thread");

    const style = (meta.style || obj.style || "casual") as WritingStyle;
    const tone = (meta.tone || obj.tone || "friendly") as Tone;
    const language = (meta.language || obj.language || "id") as Language;
    const contentGoal = (meta.contentGoal || "engagement") as ContentGoal;
    const targetAudience = String(meta.targetAudience || "General");

    const savedThread: SavedThread = {
      metadata: {
        id: generateId(),
        createdAt: String(meta.createdAt || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        topic,
        format,
        style,
        tone,
        language,
        targetAudience,
        contentGoal,
        settings: {
          numberOfTweets: tweets.length,
          numberOfVersions: 1,
          useHook: true,
          useCTA: false,
          includeEmojis: tweets.some((t) => t.hasEmoji),
          includeHashtags: tweets.some((t) => t.hashtags.length > 0),
          tweetLength: "medium",
        },
      },
      tweets,
      totalTweets: tweets.length,
      totalChars,
      version: 1,
      isFavorite: Boolean(obj.isFavorite),
      tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : [],
      notes: typeof obj.notes === "string" ? obj.notes : "",
    };

    results.push(savedThread);
  }

  return results;
}

// Parse TXT file content into SavedThread[]
function parseTXTContent(content: string, filename: string = ""): SavedThread[] {
  // Check if multiple threads are separated by divider blocks
  const threadSplitRegex =
    /(?:^|\n)(?:={10,}\s*(?:THREAD\b|\d+).*?={10,}|={10,}\s*={10,}|===+\s*(?:Thread\b|\d+|THREAD)[\s\S]*?===+)/gi;

  const hasThreadHeaders = threadSplitRegex.test(content);
  let threadBlocks: string[] = [];

  if (hasThreadHeaders) {
    threadBlocks = content
      .split(threadSplitRegex)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  }

  if (threadBlocks.length === 0) {
    threadBlocks = [content];
  }

  const results: SavedThread[] = [];

  for (const block of threadBlocks) {
    // Extract metadata from header lines if available
    let topic = "";
    let style: WritingStyle = "casual";
    let tone: Tone = "friendly";
    let language: Language = "id";

    const topicMatch = block.match(/(?:THREAD|Topic):\s*([^\n]+)/i);
    if (topicMatch) topic = topicMatch[1].trim();

    const styleMatch = block.match(/(?:Gaya|Style):\s*([a-z-]+)/i);
    if (styleMatch) style = styleMatch[1].toLowerCase() as WritingStyle;

    const toneMatch = block.match(/(?:Nada|Tone):\s*([a-z-]+)/i);
    if (toneMatch) tone = toneMatch[1].toLowerCase() as Tone;

    const langMatch = block.match(/(?:Bahasa|Language):\s*([a-z]+)/i);
    if (langMatch) {
      const l = langMatch[1].toLowerCase();
      if (l.includes("en") || l.includes("english")) language = "en";
      else language = "id";
    }

    // Strip top banner / metadata lines before parsing tweets
    const bodyContent = block
      .replace(
        /^(?:THREAD|Topic|Dibuat|Created|Format|Gaya|Style|Nada|Tone|Bahasa|Language|Total)[^\n]*\n?/gim,
        "",
      )
      .replace(/^[=\-]{10,}\s*/gm, "")
      .trim();

    // Split tweets: prefer `---` separator
    let rawTweetChunks: string[] = [];
    if (bodyContent.includes("---")) {
      rawTweetChunks = bodyContent.split(/\n\s*---\s*\n/);
    } else {
      // Try splitting by tweet order lines like `[1/5]` or `1/5` or `1.`
      const orderSplit = bodyContent.split(/(?:^|\n)(?:\[\d+[\/.)]\d*\]|\d+[\/.)]\s+)/);
      if (orderSplit.length > 1) {
        rawTweetChunks = orderSplit;
      } else {
        // Fallback: split by double newlines
        rawTweetChunks = bodyContent.split(/\n\n+/);
      }
    }

    const cleanTweetsText: string[] = rawTweetChunks
      .map((chunk) => {
        // Remove leading order markers like `[1/5]` or `1/5` or `1.`
        return chunk
          .replace(/^(?:\[\d+[\/.)]\d*\]|\d+[\/.)]\s*)/, "")
          .trim();
      })
      .filter((text) => text.length > 0);

    const tweets = normalizeTweets(cleanTweetsText);
    if (tweets.length === 0) continue;

    if (!topic) {
      topic =
        filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ") ||
        tweets[0].content.slice(0, 50).replace(/\n/g, " ");
    }

    const totalChars = tweets.reduce((acc, t) => acc + t.charCount, 0);

    results.push({
      metadata: {
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        topic,
        format: tweets.length === 1 ? "single" : "thread",
        style,
        tone,
        language,
        targetAudience: "General",
        contentGoal: "engagement",
        settings: {
          numberOfTweets: tweets.length,
          numberOfVersions: 1,
          useHook: true,
          useCTA: false,
          includeEmojis: tweets.some((t) => t.hasEmoji),
          includeHashtags: tweets.some((t) => t.hashtags.length > 0),
          tweetLength: "medium",
        },
      },
      tweets,
      totalTweets: tweets.length,
      totalChars,
      version: 1,
      isFavorite: false,
      tags: [],
      notes: "",
    });
  }

  return results;
}

// Smart auto-detect parser for imported files (JSON or TXT)
export function parseImportFile(
  rawContent: string,
  filename: string = "",
): SavedThread[] {
  const content = rawContent.trim();
  if (!content) return [];

  const isJsonFilename = filename.toLowerCase().endsWith(".json");
  const looksLikeJson =
    content.startsWith("{") ||
    content.startsWith("[") ||
    isJsonFilename;

  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(content);
      const normalized = normalizeImportedJSON(parsed);
      if (normalized.length > 0) {
        return normalized;
      }
    } catch {
      // Fallback to TXT parser
    }
  }

  return parseTXTContent(content, filename);
}

// Import threads into localStorage
export function importThreads(newThreads: SavedThread[]): {
  importedCount: number;
  totalCount: number;
} {
  if (typeof window === "undefined" || newThreads.length === 0) {
    return { importedCount: 0, totalCount: 0 };
  }

  try {
    const existing = getThreads();
    const existingIds = new Set(existing.map((t) => t.metadata.id));

    // Ensure all incoming threads have fresh unique IDs if colliding
    const sanitizedNewThreads = newThreads.map((thread) => {
      const id =
        !thread.metadata.id || existingIds.has(thread.metadata.id)
          ? generateId()
          : thread.metadata.id;

      return {
        ...thread,
        metadata: {
          ...thread.metadata,
          id,
          updatedAt: new Date().toISOString(),
        },
      };
    });

    const maxThreads = parseInt(
      process.env.NEXT_PUBLIC_MAX_THREADS_STORAGE ||
        String(DEFAULT_MAX_THREADS),
    );

    const merged = [...existing, ...sanitizedNewThreads];
    while (merged.length > maxThreads) {
      merged.shift();
    }

    const data: LocalStorageData = {
      threads: merged,
      lastUpdated: new Date().toISOString(),
      version: STORAGE_VERSION,
    };

    localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(data));
    return {
      importedCount: sanitizedNewThreads.length,
      totalCount: merged.length,
    };
  } catch (error) {
    console.error("Error importing threads to localStorage:", error);
    return { importedCount: 0, totalCount: 0 };
  }
}

// Download file helper
export function downloadFile(
  content: string,
  filename: string,
  type: string,
): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Get storage info
export function getStorageInfo(): StorageConfig & {
  currentCount: number;
  percentUsed: number;
} {
  const threads = getThreads();
  const maxThreads = parseInt(
    process.env.NEXT_PUBLIC_MAX_THREADS_STORAGE || String(DEFAULT_MAX_THREADS),
  );

  return {
    maxThreads,
    version: STORAGE_VERSION,
    currentCount: threads.length,
    percentUsed: Math.round((threads.length / maxThreads) * 100),
  };
}
