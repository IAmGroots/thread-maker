import { SavedThread } from "./thread";

export interface LocalStorageData {
  threads: SavedThread[];
  lastUpdated: string;
  version: string;
}

export const STORAGE_KEYS = {
  THREADS: "threvo_threads",
  SETTINGS: "threvo_settings",
  API_CONFIG: "threvo_api_config",
  TOPIC_BUFFER: "threvo_topic_buffer",
} as const;

export interface StorageConfig {
  maxThreads: number;
  version: string;
}

export type ExportFormat = "json" | "txt";

export interface HistoryFilters {
  searchQuery: string;
  format?: "single" | "thread" | "all";
  style?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type SortOption =
  | "date-desc"
  | "date-asc"
  | "tweets-desc"
  | "tweets-asc";
