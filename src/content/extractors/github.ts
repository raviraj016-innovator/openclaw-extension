/**
 * GitHub site-specific extractor.
 *
 * Extracts structured data from:
 * - Pull requests: number, title, author, status, files changed, checks
 * - Issues: number, title, author, labels, status
 * - Repositories: name, description, stats
 * - Code files: path, language, content snippet
 */

import type { SiteExtractor, SiteData } from '../../shared/types.js';

const GitHubExtractor: SiteExtractor = {
  name: 'github',
  priority: 10,

  matches(url: URL): boolean {
    return url.hostname === 'github.com' || url.hostname.endsWith('.github.com');
  },

  extract(doc: Document): SiteData | null {
    const path = location.pathname;

    // PR page: /owner/repo/pull/123
    const prMatch = path.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (prMatch) {
      return extractPR(doc, prMatch[1]!, prMatch[2]!, prMatch[3]!);
    }

    // Issue page: /owner/repo/issues/123
    const issueMatch = path.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (issueMatch) {
      return extractIssue(doc, issueMatch[1]!, issueMatch[2]!, issueMatch[3]!);
    }

    // Repo page: /owner/repo
    const repoMatch = path.match(/^\/([^/]+)\/([^/]+)\/?$/);
    if (repoMatch) {
      return extractRepo(doc, repoMatch[1]!, repoMatch[2]!);
    }

    return null;
  },
};

function extractPR(doc: Document, owner: string, repo: string, number: string): SiteData {
  const title = doc.querySelector('.gh-header-title .js-issue-title')?.textContent?.trim() ?? '';
  const author = doc.querySelector('.gh-header-meta .author')?.textContent?.trim() ?? '';
  const state = doc.querySelector('.State')?.textContent?.trim() ?? '';
  const filesChanged = doc.querySelector('#files_tab_counter')?.textContent?.trim() ?? '';

  // Get check status
  const checksEl = doc.querySelector('.merge-status-list');
  const checks = checksEl?.textContent?.trim() ?? '';

  // Get labels
  const labels = Array.from(doc.querySelectorAll('.IssueLabel')).map(
    (el) => el.textContent?.trim() ?? '',
  );

  // Get reviewers
  const reviewers = Array.from(doc.querySelectorAll('.reviewers-status-icon + .css-truncate')).map(
    (el) => el.textContent?.trim() ?? '',
  );

  return {
    siteName: 'GitHub',
    entityType: 'pull_request',
    data: {
      owner,
      repo,
      number: parseInt(number, 10),
      title,
      author,
      state,
      filesChanged,
      checks,
      labels,
      reviewers,
      url: location.href,
    },
  };
}

function extractIssue(doc: Document, owner: string, repo: string, number: string): SiteData {
  const title = doc.querySelector('.gh-header-title .js-issue-title')?.textContent?.trim() ?? '';
  const author = doc.querySelector('.gh-header-meta .author')?.textContent?.trim() ?? '';
  const state = doc.querySelector('.State')?.textContent?.trim() ?? '';
  const labels = Array.from(doc.querySelectorAll('.IssueLabel')).map(
    (el) => el.textContent?.trim() ?? '',
  );
  const assignees = Array.from(doc.querySelectorAll('.assignee .css-truncate-target')).map(
    (el) => el.textContent?.trim() ?? '',
  );

  return {
    siteName: 'GitHub',
    entityType: 'issue',
    data: {
      owner,
      repo,
      number: parseInt(number, 10),
      title,
      author,
      state,
      labels,
      assignees,
      url: location.href,
    },
  };
}

function extractRepo(doc: Document, owner: string, repo: string): SiteData {
  const description = doc.querySelector('[itemprop="about"]')?.textContent?.trim() ?? '';
  const stars = doc.querySelector('#repo-stars-counter-star')?.textContent?.trim() ?? '';
  const language = doc.querySelector('[itemprop="programmingLanguage"]')?.textContent?.trim() ?? '';

  return {
    siteName: 'GitHub',
    entityType: 'repository',
    data: {
      owner,
      repo,
      description,
      stars,
      language,
      url: location.href,
    },
  };
}

export default GitHubExtractor;
