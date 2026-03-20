// --- Extraction ---
export const MAX_TEXT_NODES = 5000;
export const MAX_PAYLOAD_BYTES = 500_000; // 500KB
export const EXTRACTION_DEBOUNCE_MS = 2_000;
export const EXTRACTION_MAX_INTERVAL_MS = 5_000;

// --- Connection ---
export const RECONNECT_BASE_MS = 1_000;
export const RECONNECT_MAX_MS = 60_000;
export const KEEPALIVE_INTERVAL_MS = 25_000;
export const AUTH_TIMEOUT_MS = 60_000;

// --- Tabs ---
export const BACKGROUND_PING_INTERVAL_MS = 30_000;

// --- Storage ---
export const OFFLINE_QUEUE_MAX_BYTES = 8_000_000; // 8MB of 10MB limit
export const OFFLINE_QUEUE_ITEM_TTL_MS = 3_600_000; // 1 hour
export const AUDIT_LOG_MAX_ENTRIES = 1_000;

// --- Backpressure ---
export const DEFAULT_MAX_RATE_PER_MINUTE = 12;

// --- Protocol ---
export const PROTOCOL_VERSION = '1.0';
export const EXTENSION_VERSION = '0.1.0';
