/**
 * Extractor registry — lazy-loads site-specific extractors based on URL match.
 *
 * Core content script stays slim. Site extractors are loaded dynamically
 * via import() only when the URL matches.
 */

import type { SiteData, SiteExtractor } from '../../shared/types.js';

interface ExtractorEntry {
  name: string;
  matches: (url: URL) => boolean;
  load: () => Promise<SiteExtractor>;
  priority: number;
}

const EXTRACTOR_REGISTRY: ExtractorEntry[] = [
  {
    name: 'github',
    matches: (url) => url.hostname === 'github.com' || url.hostname.endsWith('.github.com'),
    load: async () => {
      const mod = await import('./github.js');
      return mod.default;
    },
    priority: 10,
  },
  {
    name: 'jira',
    matches: (url) =>
      url.hostname.endsWith('.atlassian.net') || url.hostname.endsWith('.jira.com'),
    load: async () => {
      const mod = await import('./jira.js');
      return mod.default;
    },
    priority: 10,
  },
  {
    name: 'slack',
    matches: (url) => url.hostname === 'app.slack.com' || url.hostname === 'slack.com',
    load: async () => {
      const mod = await import('./slack.js');
      return mod.default;
    },
    priority: 10,
  },
];

/** Find and run the matching site extractor for this URL */
export async function extractSiteData(url: string): Promise<SiteData | null> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  // Sort by priority (highest first)
  const sorted = [...EXTRACTOR_REGISTRY].sort((a, b) => b.priority - a.priority);

  for (const entry of sorted) {
    if (entry.matches(parsedUrl)) {
      try {
        const extractor = await entry.load();
        return extractor.extract(document);
      } catch (e) {
        console.warn(`[ExtractorRegistry] ${entry.name} extractor failed:`, e);
        return null;
      }
    }
  }

  return null;
}
