import { SavedThread } from "./thread";

// LocalStorage data structure
export interface LocalStorageData {
  threads: SavedThread[];
  lastUpdated: string;
  version: string;
}

// Storage keys
export const STORAGE_KEYS = {
  THREADS: "threvo_threads",
  SETTINGS: "threvo_settings",
  API_CONFIG: "threvo_api_config",
} as const;

// Storage configuration
export interface StorageConfig {
  maxThreads: number;
  version: string;
}

// Export formats
export type ExportFormat = "json" | "txt";

// Filter options for history
export interface HistoryFilters {
  searchQuery: string;
  format?: "single" | "thread" | "all";
  style?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Sort options
export type SortOption =
  | "date-desc"
  | "date-asc"
  | "tweets-desc"
  | "tweets-asc";
