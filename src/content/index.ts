/**
 * Content script entry point — runs in every allowed tab.
 *
 * Responsibilities:
 * 1. Extract page content (textContent + TreeWalker)
 * 2. Watch for SPA mutations (MutationObserver + throttle)
 * 3. Run site-specific extractors (lazy-loaded by URL)
 * 4. Record user actions for workflow detection (deep integration)
 * 5. Handle debug overlay toggle
 * 6. Send all data to service worker via runtime.sendMessage
 */

import browser from 'webextension-polyfill';
import type { ContentMessage } from '../shared/messages.js';
import type { UserAction } from '../shared/types.js';
import { extractPage, resetPageTimer } from './extractor.js';
import { MutationWatcher } from './mutation-watcher.js';
import { RecorderHooks } from './recorder-hooks.js';
import { extractSiteData } from './extractors/registry.js';
import { initOverlay, updateOverlay } from './debug-overlay.js';

// Get tab ID from the runtime (injected content scripts don't know their tab ID)
let tabId = -1;
let recorder: RecorderHooks | null = null;

/** Send typed message to service worker */
function sendToBackground(message: ContentMessage): void {
  try {
    browser.runtime.sendMessage(message);
  } catch {
    // Extension context invalidated (e.g., extension updated) — silently stop
  }
}

/** Run full extraction and send to service worker */
async function performExtraction(): Promise<void> {
  if (tabId === -1) return;

  const { snapshot, hasPasswordField, hasCreditCardField } = extractPage(tabId);

  // Try site-specific extraction (lazy-loaded)
  try {
    const siteData = await extractSiteData(location.href);
    if (siteData) {
      snapshot.siteData = siteData;
    }
  } catch {
    // Site extractor failed — continue with generic extraction
  }

  const message: ContentMessage = {
    type: 'PAGE_SNAPSHOT',
    tabId,
    snapshot: {
      ...snapshot,
      // Pack sensitivity signals into a convention the SW understands
      // The SW classifier uses these to make classification decisions
      meta: {
        ...snapshot.meta,
        // @ts-expect-error — extending meta with classifier hints
        _hasPasswordField: hasPasswordField,
        _hasCreditCardField: hasCreditCardField,
      },
    },
  };

  sendToBackground(message);
}

/** Handle recorder actions */
function onUserAction(action: UserAction): void {
  sendToBackground({
    type: 'USER_ACTION',
    tabId,
    action,
  });
}

/** Handle messages from service worker */
function handleMessage(message: unknown): void {
  if (!message || typeof message !== 'object') return;
  const msg = message as Record<string, unknown>;

  switch (msg['type']) {
    case 'OVERLAY_UPDATE':
      // Service worker sends classification/connection state for this tab
      updateOverlay({
        isStreaming: Boolean(msg['isStreaming']),
        isConnected: Boolean(msg['isConnected']),
        domain: String(msg['domain'] ?? location.hostname),
        tabCount: typeof msg['tabCount'] === 'number' ? msg['tabCount'] : undefined,
      });
      break;

    case 'REQUEST_SNAPSHOT':
      performExtraction();
      break;

    case 'SET_TAB_ID':
      tabId = Number(msg['tabId']);
      recorder?.setTabId(tabId);
      resetPageTimer();
      break;
  }
}

// --- Initialization ---

function init(): void {
  // Auto-init the status bar overlay on every page
  initOverlay();

  // Listen for messages from service worker
  browser.runtime.onMessage.addListener((message: unknown) => {
    handleMessage(message);
  });

  // Notify service worker that content script is ready
  // SW will respond with tab ID
  sendToBackground({
    type: 'CONTENT_SCRIPT_READY',
    tabId: -1, // Will be filled in by SW
    url: location.href,
  });

  // Start mutation watcher
  const watcher = new MutationWatcher(() => {
    performExtraction();
  });

  // Wait for body to be available
  if (document.body) {
    watcher.start();
  } else {
    document.addEventListener('DOMContentLoaded', () => watcher.start());
  }

  // Start recorder hooks (module-level so SET_TAB_ID can update it)
  recorder = new RecorderHooks(tabId, onUserAction);
  if (document.body) {
    recorder.start();
  } else {
    document.addEventListener('DOMContentLoaded', () => recorder?.start());
  }

  // Initial extraction after a brief delay (let page settle)
  setTimeout(() => performExtraction(), 500);

  // Listen for selection events (for highlight hotkey)
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      // Store selection for when the hotkey is pressed
      // The service worker will request it via a message
      try {
        browser.storage.session.set({
          [`selection_${tabId}`]: {
            text: selection.toString(),
            context: selection.anchorNode?.parentElement?.textContent?.slice(0, 500) ?? '',
          },
        });
      } catch {
        // Session storage not available — skip
      }
    }
  });
}

init();
