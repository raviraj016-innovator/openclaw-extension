/**
 * Tab registry — tracks all open tabs, their state, and classification.
 *
 *   Tab lifecycle:
 *   ┌──────────┐   activate   ┌──────────┐   deactivate   ┌────────────┐
 *   │  OPENED  │────────────▶│  ACTIVE   │──────────────▶│ BACKGROUND │
 *   └──────────┘             └──────────┘               └────────────┘
 *        │                        │                           │
 *        └────────────────────────┴───────────────────────────┘
 *                                 │
 *                              remove
 *                                 │
 *                                 ▼
 *                           ┌──────────┐
 *                           │ REMOVED  │
 *                           └──────────┘
 */

import type { TabInfo, ClassificationResult } from '../shared/types.js';

export class TabRegistry {
  private tabs = new Map<number, TabInfo>();
  private activeTabId: number | null = null;

  getAll(): TabInfo[] {
    return Array.from(this.tabs.values());
  }

  get(tabId: number): TabInfo | undefined {
    return this.tabs.get(tabId);
  }

  getActiveTabId(): number | null {
    return this.activeTabId;
  }

  getActiveTab(): TabInfo | undefined {
    if (this.activeTabId === null) return undefined;
    return this.tabs.get(this.activeTabId);
  }

  /** Register or update a tab */
  upsert(tabId: number, url: string, title: string, classification: ClassificationResult): void {
    const existing = this.tabs.get(tabId);
    this.tabs.set(tabId, {
      tabId,
      url,
      title,
      isActive: this.activeTabId === tabId,
      classification,
      lastSnapshot: existing?.lastSnapshot ?? null,
      lastUpdateTime: Date.now(),
    });
  }

  /** Mark a tab as active, all others as background */
  activate(tabId: number): void {
    // Deactivate previous
    if (this.activeTabId !== null) {
      const prev = this.tabs.get(this.activeTabId);
      if (prev) {
        prev.isActive = false;
      }
    }

    this.activeTabId = tabId;
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.isActive = true;
    }
  }

  /** Remove a tab from the registry */
  remove(tabId: number): void {
    this.tabs.delete(tabId);
    if (this.activeTabId === tabId) {
      this.activeTabId = null;
    }
  }

  /** Update the last snapshot content for diffing */
  updateSnapshot(tabId: number, content: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.lastSnapshot = content;
      tab.lastUpdateTime = Date.now();
    }
  }

  /** Get all background (non-active) tabs for ping */
  getBackgroundTabs(): TabInfo[] {
    return Array.from(this.tabs.values()).filter(
      (t) => !t.isActive && t.classification.classification === 'allowed',
    );
  }

  /** Get count of tabs by classification */
  getCounts(): { allowed: number; blocked: number; unknown: number; total: number } {
    let allowed = 0;
    let blocked = 0;
    let unknown = 0;
    for (const tab of this.tabs.values()) {
      switch (tab.classification.classification) {
        case 'allowed':
          allowed++;
          break;
        case 'blocked':
          blocked++;
          break;
        default:
          unknown++;
      }
    }
    return { allowed, blocked, unknown, total: this.tabs.size };
  }

  /** Serialize for persistence (Chrome SW death recovery) */
  serialize(): string {
    return JSON.stringify({
      tabs: Array.from(this.tabs.entries()),
      activeTabId: this.activeTabId,
    });
  }

  /** Restore from persistence */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data) as {
        tabs: [number, TabInfo][];
        activeTabId: number | null;
      };
      this.tabs = new Map(parsed.tabs);
      this.activeTabId = parsed.activeTabId;
    } catch {
      // Corrupt data — start fresh
      this.tabs.clear();
      this.activeTabId = null;
    }
  }
}
