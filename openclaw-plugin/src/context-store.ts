/**
 * Context Store — maintains the current browser state for each connected session.
 *
 * Stores tab content, tracks active tab, and provides context retrieval
 * for OpenClaw's conversation/memory system.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │                    Context Store                         │
 *   │                                                          │
 *   │  Session "abc-123"                                       │
 *   │  ┌──────────┬──────────┬──────────┬──────────┐          │
 *   │  │ Tab 1    │ Tab 2    │ Tab 3    │ Tab 4    │          │
 *   │  │ github   │ jira     │ datadog  │ slack    │          │
 *   │  │ ★ active │          │          │          │          │
 *   │  └──────────┴──────────┴──────────┴──────────┘          │
 *   │                                                          │
 *   │  Context History (ring buffer, last N updates)           │
 *   │  [update1] [update2] [update3] ... [updateN]            │
 *   └─────────────────────────────────────────────────────────┘
 */

import type { SessionState, TabState, ContextPayload, SiteData } from './types.js';

export interface ContextEntry {
  timestamp: number;
  url: string;
  title: string;
  content: string;
  siteData: SiteData | null;
  isActive: boolean;
}

export class ContextStore {
  private sessions = new Map<string, SessionState>();
  private contextHistory = new Map<string, ContextEntry[]>();
  private maxHistory: number;

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  /** Create or get a session */
  getOrCreateSession(sessionId: string, extensionVersion: string): SessionState {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        extensionVersion,
        tabs: new Map(),
        activeTabId: null,
        lastSequence: 0,
        connectedAt: Date.now(),
        lastMessageAt: Date.now(),
      };
      this.sessions.set(sessionId, session);
      this.contextHistory.set(sessionId, []);
    }
    return session;
  }

  /** Update tab context from a context_update message */
  updateTab(sessionId: string, payload: ContextPayload, sequence: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const tab: TabState = {
      tabId: payload.tab_id,
      url: payload.url,
      title: payload.title,
      content: payload.content,
      siteData: payload.site_data,
      isActive: payload.is_active_tab,
      lastUpdated: Date.now(),
    };

    session.tabs.set(payload.tab_id, tab);
    session.lastSequence = Math.max(session.lastSequence, sequence);
    session.lastMessageAt = Date.now();

    if (payload.is_active_tab) {
      session.activeTabId = payload.tab_id;
    }

    // Add to history
    const history = this.contextHistory.get(sessionId);
    if (history) {
      history.push({
        timestamp: Date.now(),
        url: payload.url,
        title: payload.title,
        content: payload.content,
        siteData: payload.site_data,
        isActive: payload.is_active_tab,
      });
      // Ring buffer
      if (history.length > this.maxHistory) {
        history.splice(0, history.length - this.maxHistory);
      }
    }
  }

  /** Update background tab pings (lightweight: URL + title only) */
  updateTabPings(
    sessionId: string,
    tabs: Array<{ tab_id: number; url: string; title: string }>,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    for (const ping of tabs) {
      const existing = session.tabs.get(ping.tab_id);
      if (existing) {
        existing.url = ping.url;
        existing.title = ping.title;
        existing.lastUpdated = Date.now();
      } else {
        session.tabs.set(ping.tab_id, {
          tabId: ping.tab_id,
          url: ping.url,
          title: ping.title,
          content: '', // No content from pings
          siteData: null,
          isActive: false,
          lastUpdated: Date.now(),
        });
      }
    }

    session.lastMessageAt = Date.now();
  }

  /** Get the active tab's full context for a session */
  getActiveContext(sessionId: string): TabState | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.activeTabId === null) return null;
    return session.tabs.get(session.activeTabId) ?? null;
  }

  /** Get all tabs for a session (for cross-tab awareness) */
  /** Get the first (or only) session ID — convenience for single-user setups */
  getFirstSessionId(): string | null {
    const first = this.sessions.keys().next();
    return first.done ? null : first.value;
  }

  getAllTabs(sessionId: string): TabState[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return Array.from(session.tabs.values());
  }

  /** Get recent context history for a session */
  getHistory(sessionId: string, limit: number = 20): ContextEntry[] {
    const history = this.contextHistory.get(sessionId);
    if (!history) return [];
    return history.slice(-limit);
  }

  /**
   * Build a context summary string suitable for injecting into OpenClaw conversations.
   * This is the key integration point — transforms browser state into LLM context.
   */
  buildContextSummary(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return '[No browser context available]';

    const activeTab = session.activeTabId !== null
      ? session.tabs.get(session.activeTabId)
      : null;

    const parts: string[] = ['[BROWSER_CONTEXT]'];

    if (activeTab) {
      parts.push(`Active tab: ${activeTab.title}`);
      parts.push(`URL: ${activeTab.url}`);

      if (activeTab.siteData) {
        parts.push(`Site: ${activeTab.siteData.siteName} (${activeTab.siteData.entityType})`);
        parts.push(`Data: ${JSON.stringify(activeTab.siteData.data)}`);
      }

      if (activeTab.content) {
        // Truncate content for conversation injection (LLM context window)
        const maxContent = 4000;
        const content = activeTab.content.length > maxContent
          ? activeTab.content.slice(0, maxContent) + '...[truncated]'
          : activeTab.content;
        parts.push(`Page content:\n${content}`);
      }
    }

    // List other open tabs (URL + title only, for cross-tab awareness)
    const otherTabs = Array.from(session.tabs.values())
      .filter((t) => t.tabId !== session.activeTabId)
      .slice(0, 10); // Limit to 10 background tabs

    if (otherTabs.length > 0) {
      parts.push('\nOther open tabs:');
      for (const tab of otherTabs) {
        parts.push(`- ${tab.title} (${tab.url})`);
      }
    }

    parts.push('[/BROWSER_CONTEXT]');
    return parts.join('\n');
  }

  /** Remove a session (on disconnect) */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.contextHistory.delete(sessionId);
  }

  /** Get session stats */
  getStats(): { sessions: number; totalTabs: number; totalHistory: number } {
    let totalTabs = 0;
    let totalHistory = 0;
    for (const session of this.sessions.values()) {
      totalTabs += session.tabs.size;
    }
    for (const history of this.contextHistory.values()) {
      totalHistory += history.length;
    }
    return { sessions: this.sessions.size, totalTabs, totalHistory };
  }
}
