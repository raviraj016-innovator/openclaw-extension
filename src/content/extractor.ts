/**
 * Page content extractor — rich structured extraction.
 *
 * Captures everything an AI needs to understand what the user is looking at:
 * - Full page text (TreeWalker, capped at 500KB)
 * - Currently visible viewport text
 * - Scroll depth (0.0 - 1.0)
 * - Time spent on page
 * - Tab focus state
 * - Outgoing links
 * - Images with alt text
 * - Form field values (non-sensitive)
 * - Page load time
 * - Console errors
 */

import type { PageSnapshot, PageMeta, PageLink, PageImage, FormFieldData } from '../shared/types.js';
import { MAX_TEXT_NODES, MAX_PAYLOAD_BYTES } from '../shared/constants.js';

export interface ExtractionResult {
  snapshot: PageSnapshot;
  hasPasswordField: boolean;
  hasCreditCardField: boolean;
}

// Track page-level state
let pageLoadTime = Date.now();
let consoleErrors: string[] = [];

// Capture console errors
try {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(' ').slice(0, 200));
    if (consoleErrors.length > 20) consoleErrors.shift();
    originalError.apply(console, args);
  };

  window.addEventListener('error', (e) => {
    consoleErrors.push(`${e.message} at ${e.filename}:${e.lineno}`);
    if (consoleErrors.length > 20) consoleErrors.shift();
  });

  window.addEventListener('unhandledrejection', (e) => {
    consoleErrors.push(`Unhandled rejection: ${String(e.reason).slice(0, 200)}`);
    if (consoleErrors.length > 20) consoleErrors.shift();
  });
} catch {
  // Content script security restrictions
}

/** Reset page load timer on navigation */
export function resetPageTimer(): void {
  pageLoadTime = Date.now();
  consoleErrors = [];
}

/**
 * Extract full page context — rich structured data.
 */
export function extractPage(tabId: number): ExtractionResult {
  const content = extractTextContent();
  const meta = extractMeta();
  const hasPasswordField = document.querySelector('input[type="password"]') !== null;
  const hasCreditCardField =
    document.querySelector('input[autocomplete="cc-number"]') !== null ||
    document.querySelector('input[autocomplete="cc-exp"]') !== null ||
    document.querySelector('input[autocomplete="cc-csc"]') !== null ||
    document.querySelector('input[name*="card" i]') !== null;

  const snapshot: PageSnapshot = {
    tabId,
    url: location.href,
    title: document.title,
    content,
    siteData: null,
    meta,
    timestamp: new Date().toISOString(),
    // Rich context signals
    scrollDepth: getScrollDepth(),
    timeOnPageMs: Date.now() - pageLoadTime,
    isTabFocused: document.hasFocus(),
    visibleText: extractVisibleText(),
    links: extractLinks(),
    images: extractImages(),
    formData: extractFormData(hasPasswordField),
    pageLoadMs: getPageLoadTime(),
    consoleErrors: [...consoleErrors],
  };

  return { snapshot, hasPasswordField, hasCreditCardField };
}

/** Scroll depth: 0.0 (top) to 1.0 (bottom) */
function getScrollDepth(): number {
  const scrollHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight ?? 0,
  );
  const viewportHeight = window.innerHeight;
  const scrollTop = window.scrollY;

  if (scrollHeight <= viewportHeight) return 1.0; // Page fits in viewport
  return Math.min(1.0, (scrollTop + viewportHeight) / scrollHeight);
}

/** Extract only the text currently visible in the viewport */
function extractVisibleText(): string {
  const parts: string[] = [];
  const walker = document.createTreeWalker(
    document.body ?? document.documentElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;

        // Check if element is in viewport
        const rect = parent.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let len = 0;
  while (walker.nextNode() && len < 50_000) {
    const text = walker.currentNode.textContent?.trim();
    if (text) {
      parts.push(text);
      len += text.length;
    }
  }
  return parts.join(' ').slice(0, 50_000);
}

/** Extract outgoing links (first 50) */
function extractLinks(): PageLink[] {
  const links: PageLink[] = [];
  const seen = new Set<string>();
  const anchors = document.querySelectorAll('a[href]');

  for (const a of anchors) {
    if (links.length >= 50) break;
    const anchor = a as HTMLAnchorElement;
    const href = anchor.href;
    if (!href || href.startsWith('javascript:') || seen.has(href)) continue;
    seen.add(href);

    let isExternal = false;
    try {
      isExternal = new URL(href).hostname !== location.hostname;
    } catch { /* relative URL */ }

    links.push({
      href,
      text: anchor.textContent?.trim().slice(0, 100) ?? '',
      isExternal,
    });
  }
  return links;
}

/** Extract images with alt text (first 20) */
function extractImages(): PageImage[] {
  const images: PageImage[] = [];
  const imgElements = document.querySelectorAll('img[src]');

  for (const img of imgElements) {
    if (images.length >= 20) break;
    const imgEl = img as HTMLImageElement;
    if (!imgEl.src || imgEl.width < 50 || imgEl.height < 50) continue; // skip tiny icons

    images.push({
      src: imgEl.src,
      alt: imgEl.alt ?? '',
      width: imgEl.naturalWidth || imgEl.width,
      height: imgEl.naturalHeight || imgEl.height,
    });
  }
  return images;
}

/** Extract form field values (non-sensitive) */
function extractFormData(hasPasswordField: boolean): FormFieldData[] {
  const fields: FormFieldData[] = [];
  const inputs = document.querySelectorAll('input, select, textarea');

  for (const input of inputs) {
    if (fields.length >= 30) break;
    const el = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    // Skip password, hidden, and credit card fields
    if (el instanceof HTMLInputElement) {
      if (el.type === 'password' || el.type === 'hidden') continue;
      if (el.autocomplete?.includes('cc-')) continue;
    }

    // Skip empty fields
    if (!el.value) continue;

    // Get label
    let label: string | null = null;
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      label = labelEl?.textContent?.trim().slice(0, 50) ?? null;
    }
    if (!label && el.getAttribute('aria-label')) {
      label = el.getAttribute('aria-label');
    }
    if (!label && el.getAttribute('placeholder')) {
      label = el.getAttribute('placeholder');
    }

    // Sanitize value — keep search/filter queries, redact if page has password fields
    let value = el.value.slice(0, 200);
    if (hasPasswordField && el instanceof HTMLInputElement && el.type === 'text') {
      // Page has a password field — might be a login form, redact all text inputs
      value = '[redacted]';
    }

    fields.push({
      name: el.name || el.id || '',
      type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
      value,
      label,
    });
  }
  return fields;
}

/** Page load time from Performance API */
function getPageLoadTime(): number {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      return Math.round(nav.loadEventEnd - nav.startTime);
    }
  } catch { /* not available */ }
  return 0;
}

/**
 * Extract text using TreeWalker — O(n) walk of text nodes, no reflow.
 */
function extractTextContent(): string {
  if (!document.body) return '';

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') {
          return NodeFilter.FILTER_REJECT;
        }

        const text = node.textContent?.trim();
        if (!text) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const parts: string[] = [];
  let nodeCount = 0;
  let totalLength = 0;

  while (walker.nextNode()) {
    if (nodeCount >= MAX_TEXT_NODES) break;
    if (totalLength >= MAX_PAYLOAD_BYTES) break;

    const text = walker.currentNode.textContent?.trim();
    if (text) {
      parts.push(text);
      totalLength += text.length;
      nodeCount++;
    }
  }

  let result = parts.join(' ');
  if (result.length > MAX_PAYLOAD_BYTES) {
    result = result.slice(0, MAX_PAYLOAD_BYTES);
  }
  return result;
}

/** Extract OpenGraph and standard meta tags */
function extractMeta(): PageMeta {
  const getMeta = (property: string): string | null => {
    const el =
      document.querySelector(`meta[property="${property}"]`) ??
      document.querySelector(`meta[name="${property}"]`);
    return el?.getAttribute('content') ?? null;
  };

  return {
    ogTitle: getMeta('og:title'),
    ogDescription: getMeta('og:description') ?? getMeta('description'),
    ogImage: getMeta('og:image'),
    charset: document.characterSet ?? null,
    lang: document.documentElement.lang ?? null,
  };
}
