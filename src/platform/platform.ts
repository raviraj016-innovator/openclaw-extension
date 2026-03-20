/**
 * Platform abstraction layer.
 *
 * Encapsulates the lifecycle difference between Chrome MV3 (service worker,
 * ephemeral, killed after ~30s idle) and Firefox MV2 (event page, persistent).
 *
 *   Chrome:  SW dies → state lost → reconnect on wake → flush from storage
 *   Firefox: Event page stays alive → in-memory state → persistent connection
 */

import type { Result } from '../shared/result.js';

export interface PlatformStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface Platform {
  readonly name: 'chrome' | 'firefox';

  /** Whether the background context is ephemeral (Chrome SW) or persistent (Firefox) */
  readonly isEphemeral: boolean;

  /** Session-scoped storage (cleared on browser close). Chrome: chrome.storage.session. Firefox: in-memory. */
  readonly sessionStorage: PlatformStorage;

  /** Persistent storage (survives restarts). Both: chrome.storage.local / browser.storage.local. */
  readonly persistentStorage: PlatformStorage;

  /** Register a listener for when the background context wakes from sleep (Chrome only, no-op on Firefox) */
  onWake(callback: () => void): void;

  /** Set the extension badge text and color */
  setBadge(text: string, color: string): Promise<void>;

  /** Open the side panel for a given tab */
  openSidePanel(tabId: number): Promise<Result<void, Error>>;

  /** Get the currently active tab */
  getActiveTab(): Promise<Result<{ tabId: number; url: string; title: string }, Error>>;

  /** Send a message to a content script in a specific tab */
  sendToTab(tabId: number, message: unknown): Promise<Result<unknown, Error>>;

  /** Listen for messages from content scripts and UI */
  onMessage(callback: (message: unknown, sender: { tabId?: number }, sendResponse: (response: unknown) => void) => void): void;

  /** Create a context menu item */
  createContextMenu(options: {
    id: string;
    title: string;
    contexts: string[];
  }): void;

  /** Listen for context menu clicks */
  onContextMenuClick(callback: (info: { menuItemId: string; selectionText?: string; linkUrl?: string; pageUrl?: string }, tabId?: number) => void): void;

  /** Listen for keyboard commands */
  onCommand(callback: (command: string) => void): void;

  /** Listen for tab activation changes */
  onTabActivated(callback: (tabId: number) => void): void;

  /** Listen for tab removal */
  onTabRemoved(callback: (tabId: number) => void): void;

  /** Listen for navigation committed (page load) */
  onNavigationCommitted(callback: (tabId: number, url: string) => void): void;
}
