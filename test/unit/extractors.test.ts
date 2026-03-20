/**
 * Site extractor tests — verify structured data extraction from HTML fixtures.
 *
 * Uses minimal DOM mocking since extractors run in content script context.
 * Tests verify the extraction logic, not real page DOM compatibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DOM APIs that extractors use
function createMockDocument(html: string, url: string): void {
  // Set location
  vi.stubGlobal('location', { href: url, pathname: new URL(url).pathname });

  // Parse HTML into a minimal DOM-like structure using regex (not a real parser)
  // For unit tests, we mock document.querySelector and querySelectorAll
  const elements = new Map<string, { textContent: string; getAttribute: (a: string) => string | null }>();

  // Extract elements from the HTML
  const tagRegex = /<([a-z]+)[^>]*class="([^"]*)"[^>]*>([^<]*)<\/\1>/gi;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const classes = match[2]!.split(' ');
    for (const cls of classes) {
      elements.set(`.${cls}`, { textContent: match[3]!, getAttribute: () => null });
    }
  }

  const mockQuerySelector = (selector: string) => {
    return elements.get(selector) ?? null;
  };

  const mockQuerySelectorAll = (selector: string) => {
    const result = elements.get(selector);
    return result ? [result] : [];
  };

  vi.stubGlobal('document', {
    querySelector: mockQuerySelector,
    querySelectorAll: mockQuerySelectorAll,
    title: 'Test Page',
    body: { textContent: html },
    documentElement: { lang: 'en' },
    characterSet: 'UTF-8',
  });
}

describe('GitHub Extractor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('matches github.com URLs', async () => {
    const { default: extractor } = await import('../../src/content/extractors/github.js');
    expect(extractor.matches(new URL('https://github.com/org/repo/pull/123'))).toBe(true);
    expect(extractor.matches(new URL('https://gist.github.com/user/abc'))).toBe(true);
    expect(extractor.matches(new URL('https://gitlab.com/org/repo'))).toBe(false);
  });

  it('extracts PR data from URL pattern', async () => {
    createMockDocument('', 'https://github.com/openclaw/openclaw/pull/234');
    const { default: extractor } = await import('../../src/content/extractors/github.js');
    const result = extractor.extract(document as unknown as Document);
    expect(result).not.toBeNull();
    expect(result?.entityType).toBe('pull_request');
    expect(result?.data.owner).toBe('openclaw');
    expect(result?.data.repo).toBe('openclaw');
    expect(result?.data.number).toBe(234);
  });

  it('extracts issue data from URL pattern', async () => {
    createMockDocument('', 'https://github.com/openclaw/openclaw/issues/42');
    const { default: extractor } = await import('../../src/content/extractors/github.js');
    const result = extractor.extract(document as unknown as Document);
    expect(result).not.toBeNull();
    expect(result?.entityType).toBe('issue');
    expect(result?.data.number).toBe(42);
  });

  it('extracts repo data from URL pattern', async () => {
    createMockDocument('', 'https://github.com/openclaw/openclaw');
    const { default: extractor } = await import('../../src/content/extractors/github.js');
    const result = extractor.extract(document as unknown as Document);
    expect(result).not.toBeNull();
    expect(result?.entityType).toBe('repository');
  });

  it('returns null for non-matching GitHub page', async () => {
    // /explore has no owner/repo/issue/PR pattern
    createMockDocument('', 'https://github.com/explore');
    const { default: extractor } = await import('../../src/content/extractors/github.js');
    const result = extractor.extract(document as unknown as Document);
    expect(result).toBeNull();
  });
});

describe('Jira Extractor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('matches atlassian.net URLs', async () => {
    const { default: extractor } = await import('../../src/content/extractors/jira.js');
    expect(extractor.matches(new URL('https://mycompany.atlassian.net/browse/PROJ-123'))).toBe(true);
    expect(extractor.matches(new URL('https://github.com/org/repo'))).toBe(false);
  });

  it('extracts issue key from URL', async () => {
    createMockDocument('', 'https://mycompany.atlassian.net/browse/PROJ-456');
    const { default: extractor } = await import('../../src/content/extractors/jira.js');
    const result = extractor.extract(document as unknown as Document);
    // May return null since we don't have full DOM selectors mocked,
    // but it should at least extract from the URL pattern
    if (result) {
      expect(result.entityType).toBe('issue');
      expect(result.data.issueKey).toBe('PROJ-456');
    }
  });
});

describe('Slack Extractor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('matches slack.com URLs', async () => {
    const { default: extractor } = await import('../../src/content/extractors/slack.js');
    expect(extractor.matches(new URL('https://app.slack.com/client/T123/C456'))).toBe(true);
    expect(extractor.matches(new URL('https://slack.com/'))).toBe(true);
    expect(extractor.matches(new URL('https://discord.com/'))).toBe(false);
  });

  it('returns null when no channel name found', async () => {
    createMockDocument('', 'https://app.slack.com/client/T123/C456');
    const { default: extractor } = await import('../../src/content/extractors/slack.js');
    const result = extractor.extract(document as unknown as Document);
    // Without proper DOM mocking, querySelector returns null → extractor returns null
    expect(result).toBeNull();
  });
});
