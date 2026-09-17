import { SavedThread } from "@/types/thread";
import { STORAGE_KEYS, LocalStorageData, StorageConfig } from "@/types/storage";

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

// Export threads to JSON
export function exportToJSON(): string {
  const threads = getThreads();
  return JSON.stringify(threads, null, 2);
}

// Export threads to TXT format
export function exportToTXT(): string {
  const threads = getThreads();
  let output = "";

  threads.forEach((thread, index) => {
    output += `=== Thread ${index + 1} ===\n`;
    output += `Topic: ${thread.metadata.topic}\n`;
    output += `Created: ${thread.metadata.createdAt}\n`;
    output += `Style: ${thread.metadata.style} | Tone: ${thread.metadata.tone}\n`;
    output += `\n`;

    thread.tweets.forEach((tweet) => {
      output += `${tweet.order}/${thread.totalTweets}\n`;
      output += `${tweet.content}\n`;
      output += `---\n`;
    });

    output += `\n\n`;
  });

  return output;
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
