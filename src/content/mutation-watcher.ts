/**
 * MutationObserver with intelligent throttling for SPA detection.
 *
 * Watches for DOM changes and triggers re-extraction when meaningful
 * content changes. Debounces at 2s, caps at 1 re-extraction per 5s.
 *
 * "Meaningful" = text content changes, not just class/style attribute changes.
 */

import { EXTRACTION_DEBOUNCE_MS, EXTRACTION_MAX_INTERVAL_MS } from '../shared/constants.js';

export type MutationCallback = () => void;

export class MutationWatcher {
  private observer: MutationObserver | null = null;
  private callback: MutationCallback;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastExtractionTime = 0;
  private isRunning = false;

  constructor(callback: MutationCallback) {
    this.callback = callback;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.observer = new MutationObserver((mutations) => {
      if (this.hasMeaningfulChange(mutations)) {
        this.scheduleExtraction();
      }
    });

    this.observer.observe(document.body ?? document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      // NOT observing attributes — class/style changes aren't meaningful content changes
    });

    // Also watch for SPA navigation via History API
    this.watchHistoryApi();
  }

  stop(): void {
    this.isRunning = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Filter out noise mutations (style changes, class toggles, ad injections).
   * Only trigger on actual text content changes.
   */
  private hasMeaningfulChange(mutations: MutationRecord[]): boolean {
    for (const mutation of mutations) {
      // Text content changed
      if (mutation.type === 'characterData') {
        return true;
      }

      // Nodes added or removed
      if (mutation.type === 'childList') {
        // Check if added/removed nodes contain meaningful text
        for (const node of mutation.addedNodes) {
          if (this.nodeHasText(node)) return true;
        }
        for (const node of mutation.removedNodes) {
          if (this.nodeHasText(node)) return true;
        }
      }
    }
    return false;
  }

  /** Check if a node (or its children) contains non-trivial text */
  private nodeHasText(node: Node): boolean {
    // Text node with content
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent?.trim().length ?? 0) > 0;
    }

    // Element node — check if it's a content element (not script/style)
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META') {
        return false;
      }
      // Check textContent length as a quick heuristic
      return (el.textContent?.trim().length ?? 0) > 10;
    }

    return false;
  }

  /**
   * Debounce extraction: wait EXTRACTION_DEBOUNCE_MS after last mutation.
   * Cap: at most one extraction per EXTRACTION_MAX_INTERVAL_MS.
   */
  private scheduleExtraction(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      const now = Date.now();
      const timeSinceLastExtraction = now - this.lastExtractionTime;

      if (timeSinceLastExtraction >= EXTRACTION_MAX_INTERVAL_MS) {
        this.lastExtractionTime = now;
        this.callback();
      } else {
        // Cap: schedule for when the interval allows
        const delay = EXTRACTION_MAX_INTERVAL_MS - timeSinceLastExtraction;
        this.debounceTimer = setTimeout(() => {
          this.lastExtractionTime = Date.now();
          this.callback();
        }, delay);
      }
    }, EXTRACTION_DEBOUNCE_MS);
  }

  /** Watch for SPA navigation via History API (pushState/replaceState/popstate) */
  private watchHistoryApi(): void {
    // popstate fires on back/forward
    window.addEventListener('popstate', () => {
      this.scheduleExtraction();
    });

    // Monkey-patch pushState and replaceState to detect SPA navigation
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      originalPushState(...args);
      this.scheduleExtraction();
    };

    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      originalReplaceState(...args);
      this.scheduleExtraction();
    };
  }
}
