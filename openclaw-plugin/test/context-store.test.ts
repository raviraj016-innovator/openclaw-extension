import { describe, it, expect, beforeEach } from 'vitest';
import { ContextStore } from '../src/context-store.js';
import type { ContextPayload } from '../src/types.js';

function makePayload(overrides: Partial<ContextPayload> = {}): ContextPayload {
  return {
    tab_id: 1,
    url: 'https://github.com/org/repo/pull/123',
    title: 'feat: add streaming',
    content: 'Pull request content here...',
    site_data: {
      siteName: 'GitHub',
      entityType: 'pull_request',
      data: { number: 123, owner: 'org', repo: 'repo' },
    },
    meta: {},
    classification: 'allowed',
    is_active_tab: true,
    ...overrides,
  };
}

describe('ContextStore', () => {
  let store: ContextStore;

  beforeEach(() => {
    store = new ContextStore(50);
  });

  it('creates sessions on demand', () => {
    const session = store.getOrCreateSession('session-1', '0.1.0');
    expect(session.sessionId).toBe('session-1');
    expect(session.tabs.size).toBe(0);
  });

  it('returns existing session on second call', () => {
    store.getOrCreateSession('session-1', '0.1.0');
    const session = store.getOrCreateSession('session-1', '0.1.0');
    expect(session.sessionId).toBe('session-1');
  });

  it('updates tab context', () => {
    store.getOrCreateSession('s1', '0.1.0');
    store.updateTab('s1', makePayload(), 1);

    const tabs = store.getAllTabs('s1');
    expect(tabs).toHaveLength(1);
    expect(tabs[0]!.url).toBe('https://github.com/org/repo/pull/123');
  });

  it('tracks active tab', () => {
    store.getOrCreateSession('s1', '0.1.0');
    store.updateTab('s1', makePayload({ tab_id: 1, is_active_tab: true }), 1);
    store.updateTab('s1', makePayload({ tab_id: 2, url: 'https://jira.com', is_active_tab: false }), 2);

    const active = store.getActiveContext('s1');
    expect(active?.tabId).toBe(1);
  });

  it('updates active tab when new tab becomes active', () => {
    store.getOrCreateSession('s1', '0.1.0');
    store.updateTab('s1', makePayload({ tab_id: 1, is_active_tab: true }), 1);
    store.updateTab('s1', makePayload({ tab_id: 2, is_active_tab: true }), 2);

    const active = store.getActiveContext('s1');
    expect(active?.tabId).toBe(2);
  });

  it('handles tab pings (lightweight updates)', () => {
    store.getOrCreateSession('s1', '0.1.0');
    store.updateTabPings('s1', [
      { tab_id: 10, url: 'https://slack.com', title: 'Slack' },
      { tab_id: 11, url: 'https://notion.so', title: 'Notion' },
    ]);

    const tabs = store.getAllTabs('s1');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]!.content).toBe(''); // Pings don't include content
  });

  it('maintains context history', () => {
    store.getOrCreateSession('s1', '0.1.0');
    store.updateTab('s1', makePayload({ url: 'https://a.com' }), 1);
    store.updateTab('s1', makePayload({ url: 'https://b.com' }), 2);
    store.updateTab('s1', makePayload({ url: 'https://c.com' }), 3);

    const history = store.getHistory('s1');
    expect(history).toHaveLength(3);
    expect(history[0]!.url).toBe('https://a.com');
    expect(history[2]!.url).toBe('https://c.com');
  });

  it('enforces history limit (ring buffer)', () => {
    const smallStore = new ContextStore(3);
    smallStore.getOrCreateSession('s1', '0.1.0');

    for (let i = 0; i < 10; i++) {
      smallStore.updateTab('s1', makePayload({ url: `https://page-${i}.com` }), i);
    }

    const history = smallStore.getHistory('s1');
    expect(history).toHaveLength(3);
    expect(history[0]!.url).toBe('https://page-7.com');
  });

  it('builds context summary with active tab', () => {
    store.getOrCreateSession('s1', '0.1.0');
    store.updateTab('s1', makePayload({
      tab_id: 1,
      is_active_tab: true,
      title: 'My PR',
      url: 'https://github.com/org/repo/pull/1',
      content: 'Some page content',
    }), 1);

    const summary = store.buildContextSummary('s1');
    expect(summary).toContain('[BROWSER_CONTEXT]');
    expect(summary).toContain('Active tab: My PR');
    expect(summary).toContain('https://github.com/org/repo/pull/1');
    expect(summary).toContain('Some page content');
    expect(summary).toContain('[/BROWSER_CONTEXT]');
  });

  it('includes site data in summary', () => {
    store.getOrCreateSession('s1', '0.1.0');
    store.updateTab('s1', makePayload({ is_active_tab: true }), 1);

    const summary = store.buildContextSummary('s1');
    expect(summary).toContain('GitHub');
    expect(summary).toContain('pull_request');
  });

  it('includes other open tabs in summary', () => {
    store.getOrCreateSession('s1', '0.1.0');
    store.updateTab('s1', makePayload({ tab_id: 1, is_active_tab: true }), 1);
    store.updateTab('s1', makePayload({ tab_id: 2, url: 'https://slack.com', title: 'Slack', is_active_tab: false }), 2);

    const summary = store.buildContextSummary('s1');
    expect(summary).toContain('Other open tabs');
    expect(summary).toContain('Slack');
  });

  it('returns fallback for missing session', () => {
    const summary = store.buildContextSummary('nonexistent');
    expect(summary).toContain('No browser context available');
  });

  it('removes sessions', () => {
    store.getOrCreateSession('s1', '0.1.0');
    store.updateTab('s1', makePayload(), 1);
    store.removeSession('s1');

    expect(store.getAllTabs('s1')).toHaveLength(0);
    expect(store.getStats().sessions).toBe(0);
  });

  it('reports stats', () => {
    store.getOrCreateSession('s1', '0.1.0');
    store.updateTab('s1', makePayload({ tab_id: 1 }), 1);
    store.updateTab('s1', makePayload({ tab_id: 2, url: 'https://other.com' }), 2);

    const stats = store.getStats();
    expect(stats.sessions).toBe(1);
    expect(stats.totalTabs).toBe(2);
    expect(stats.totalHistory).toBe(2);
  });
});
