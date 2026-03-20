// --- Classification ---
export type Classification = 'allowed' | 'blocked' | 'unknown';

export type ClassificationSource =
  | 'user_override'
  | 'known_allow_list'
  | 'known_block_list'
  | 'heuristic_block'
  | 'default_block'
  | 'default_allow';

export interface ClassificationResult {
  classification: Classification;
  source: ClassificationSource;
  domain: string;
  reason: string;
}

// --- Tab State ---
export interface TabInfo {
  tabId: number;
  url: string;
  title: string;
  isActive: boolean;
  classification: ClassificationResult;
  lastSnapshot: string | null; // for diffing
  lastUpdateTime: number;
}

// --- Site Extractors ---
export interface SiteData {
  siteName: string;
  entityType: string;
  data: Record<string, unknown>;
}

export interface SiteExtractor {
  name: string;
  matches(url: URL): boolean;
  extract(document: Document): SiteData | null;
  priority: number;
}

// --- Page Snapshot ---
export interface PageSnapshot {
  tabId: number;
  url: string;
  title: string;
  content: string;
  siteData: SiteData | null;
  meta: PageMeta;
  timestamp: string;
  // Rich context signals
  scrollDepth: number;           // 0.0 - 1.0 (how far down the page)
  timeOnPageMs: number;          // ms since page load
  isTabFocused: boolean;         // is the browser tab actually focused?
  visibleText: string;           // text currently in the viewport
  links: PageLink[];             // outgoing links on the page
  images: PageImage[];           // images with alt text
  formData: FormFieldData[];     // non-sensitive form values
  pageLoadMs: number;            // page load time
  consoleErrors: string[];       // JS errors on the page
}

export interface PageLink {
  href: string;
  text: string;
  isExternal: boolean;
}

export interface PageImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface FormFieldData {
  name: string;
  type: string;
  value: string;           // sanitized: passwords → redacted, others → included
  label: string | null;
}

export interface PageMeta {
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  charset: string | null;
  lang: string | null;
}

// --- Auth ---
export type AuthMethod = 'oauth' | 'api_key';

export interface AuthState {
  method: AuthMethod;
  token: string;
  instanceUrl: string;
  expiresAt: number | null; // null for API keys
  refreshToken: string | null; // null for API keys
}

// --- Connection ---
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// --- Extension State (owned by service worker, subscribed by UIs) ---
export interface ExtensionState {
  connection: ConnectionStatus;
  auth: AuthState | null;
  tabs: TabInfo[];
  activeTabId: number | null;
  offlineQueueDepth: number;
  isPaused: boolean;
  backpressureRate: number | null; // messages per minute, null = unlimited
  extensionVersion: string;
}

// --- User Action (for workflow recorder) ---
export type UserActionType = 'click' | 'input' | 'submit' | 'navigation' | 'select' | 'copy' | 'paste' | 'scroll' | 'focus' | 'blur';

export interface UserAction {
  type: UserActionType;
  timestamp: string;
  tabId: number;
  url: string;
  target: {
    selector: string;
    tagName: string;
    text: string | null;
    href: string | null;
  };
  value: string | null;
}

// --- Workflow Pattern ---
export interface WorkflowPattern {
  id: string;
  name: string;
  steps: UserAction[];
  frequency: number; // how many times observed
  lastSeen: string;
}

// --- Audit Log ---
export interface AuditEntry {
  timestamp: string;
  type: 'classification' | 'context_sent' | 'context_blocked' | 'auth_event';
  domain: string;
  detail: string;
  contentHash: string | null; // SHA-256 of content, not content itself
}

// --- Suggestion (from OpenClaw) ---
export interface OpenClawSuggestion {
  id: string;
  title: string;
  body: string;
  actions: Array<{
    label: string;
    url?: string;
    action?: string;
  }>;
  priority: 'low' | 'normal' | 'high';
  relatedTabId: number | null;
}

// --- Chat ---
export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
