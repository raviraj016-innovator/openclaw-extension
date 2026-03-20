/**
 * Offline context buffer — ring buffer that stores context messages
 * when the WebSocket is disconnected.
 *
 * Uses chrome.storage.session (Chrome) or in-memory (Firefox) via Platform.
 * Implements ring buffer eviction when approaching storage quota.
 *
 *   ┌─────────────────────────────────────────────────┐
 *   │  Ring Buffer (max ~8MB)                         │
 *   │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐    │
 *   │  │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │10│    │
 *   │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘    │
 *   │       ▲ (oldest — evict first)       ▲ (newest) │
 *   └─────────────────────────────────────────────────┘
 *
 *   On flush: send all items oldest-first, remove after ACK.
 *   On quota exceeded: evict oldest items until under limit.
 */

import type { OutboundProtocolMessage } from '../shared/protocol.js';
import type { Platform } from '../platform/platform.js';
import { OFFLINE_QUEUE_MAX_BYTES, OFFLINE_QUEUE_ITEM_TTL_MS } from '../shared/constants.js';

interface QueueItem {
  message: OutboundProtocolMessage;
  queuedAt: number;
  sizeEstimate: number;
}

const STORAGE_KEY = 'offlineQueue';

const PERSIST_DEBOUNCE_MS = 10_000;

export class ContextBuffer {
  private platform: Platform;
  private queue: QueueItem[] = [];
  private totalSize = 0;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persistDirty = false;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  /** Load buffered items from storage (after SW restart) */
  async load(): Promise<void> {
    const stored = await this.platform.sessionStorage.get<QueueItem[]>(STORAGE_KEY);
    if (stored) {
      this.queue = stored;
      this.totalSize = stored.reduce((sum, item) => sum + item.sizeEstimate, 0);
      this.evictStale();
    }
  }

  /** Add a message to the offline queue */
  async enqueue(message: OutboundProtocolMessage): Promise<void> {
    const serialized = JSON.stringify(message);
    const sizeEstimate = serialized.length * 2; // rough byte estimate (UTF-16)

    const item: QueueItem = {
      message,
      queuedAt: Date.now(),
      sizeEstimate,
    };

    // Evict old items if we'd exceed quota
    while (this.totalSize + sizeEstimate > OFFLINE_QUEUE_MAX_BYTES && this.queue.length > 0) {
      const evicted = this.queue.shift();
      if (evicted) {
        this.totalSize -= evicted.sizeEstimate;
      }
    }

    this.queue.push(item);
    this.totalSize += sizeEstimate;

    this.schedulePersist();
  }

  /** Get all queued messages for flushing (oldest first) */
  drain(): OutboundProtocolMessage[] {
    this.evictStale();
    const messages = this.queue.map((item) => item.message);
    this.queue = [];
    this.totalSize = 0;
    // Drain is a significant event — persist immediately
    this.cancelPersist();
    this.persist();
    return messages;
  }

  /** Number of items in the queue */
  get depth(): number {
    return this.queue.length;
  }

  /** Estimated total size in bytes */
  get size(): number {
    return this.totalSize;
  }

  /** Debounced persist: write to storage at most every PERSIST_DEBOUNCE_MS */
  private schedulePersist(): void {
    this.persistDirty = true;
    if (this.persistTimer) return; // already scheduled
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      if (this.persistDirty) {
        this.persistDirty = false;
        this.persist();
      }
    }, PERSIST_DEBOUNCE_MS);
  }

  private cancelPersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.persistDirty = false;
  }

  /** Remove items older than TTL */
  private evictStale(): void {
    const now = Date.now();
    while (this.queue.length > 0 && this.queue[0]!.queuedAt + OFFLINE_QUEUE_ITEM_TTL_MS < now) {
      const evicted = this.queue.shift();
      if (evicted) {
        this.totalSize -= evicted.sizeEstimate;
      }
    }
  }

  private async persist(): Promise<void> {
    try {
      await this.platform.sessionStorage.set(STORAGE_KEY, this.queue);
    } catch {
      // QuotaExceededError — evict half and retry
      const half = Math.floor(this.queue.length / 2);
      const evicted = this.queue.splice(0, half);
      this.totalSize -= evicted.reduce((sum, item) => sum + item.sizeEstimate, 0);
      try {
        await this.platform.sessionStorage.set(STORAGE_KEY, this.queue);
      } catch {
        // Still failing — clear everything
        this.queue = [];
        this.totalSize = 0;
        await this.platform.sessionStorage.remove(STORAGE_KEY);
      }
    }
  }
}
