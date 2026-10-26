import "server-only";

export type ProviderId =
  | "threads"
  | "instagram"
  | "facebook"
  | "pinterest"
  | "tiktok";

export interface ProviderCapabilities {
  text: boolean;
  image: boolean;
  video: boolean;
  carousel: boolean;
  thread: boolean;
  analytics: boolean;
  delete: boolean;
  requiresMedia: boolean;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
}

export interface ProviderProfile {
  providerAccountId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PostMedia {
  url: string;
  mimeType: string;
  altText?: string;
}

export interface PostInput {
  segments: string[];
  media?: PostMedia[];
  options?: Record<string, unknown>;
}

export interface ValidationIssue {
  segmentIndex?: number;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface PublishInput {
  accessToken: string;
  post: PostInput;
  idempotencyKey: string;
  providerState?: Record<string, unknown>;
  checkpoint?: number;
  onCheckpoint?: (index: number, providerState: Record<string, unknown>) => Promise<void>;
}

export interface PublishResult {
  status: "published" | "partial" | "failed";
  providerPostId?: string;
  providerUrl?: string;
  publishedCount: number;
  total: number;
  failedAtIndex: number | null;
  providerState?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  raw?: unknown;
}

export interface AuthUrlInput {
  state: string;
  redirectUri: string;
  codeChallenge?: string;
}

export interface ExchangeInput {
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}

export interface RefreshInput {
  /**
   * The provider's refresh token. Providers that rotate the access token in
   * place (Threads) receive their current access token here instead.
   */
  refreshToken: string;
}

export interface DeleteInput {
  accessToken: string;
  providerPostId: string;
}

export interface AnalyticsInput {
  accessToken: string;
  providerPostId: string;
  since?: Date;
}

export interface RawMetrics {
  capturedAt: Date;
  views?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  quotes?: number;
  videoViews?: number;
  raw: Record<string, unknown>;
}

export interface SocialProvider {
  id: ProviderId;
  capabilities: ProviderCapabilities;
  getAuthUrl(input: AuthUrlInput): string;
  exchangeCode(input: ExchangeInput): Promise<TokenSet>;
  refreshToken(input: RefreshInput): Promise<TokenSet>;
  getProfile(accessToken: string): Promise<ProviderProfile>;
  validatePost(input: PostInput): ValidationResult;
  publish(input: PublishInput): Promise<PublishResult>;
  deletePost?(input: DeleteInput): Promise<void>;
  getAnalytics?(input: AnalyticsInput): Promise<RawMetrics[]>;
}
