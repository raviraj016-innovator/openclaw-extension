/**
 * Service Worker — central orchestrator.
 *
 * Owns all state. Coordinates content scripts, connection, classification,
 * buffering, workflow recording, and UI messaging.
 *
 *   ┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────┐
 *   │ Content      │────▶│ Service     │────▶│ Plugin       │────▶│ OpenClaw │
 *   │ Script (N)   │ msg │ Worker      │ ws  │ :18790       │ http│ Gateway  │
 *   └─────────────┘     │             │     └──────────────┘     │ :18789   │
 *                        │  Tab Reg    │            │             └──────────┘
 *   ┌─────────────┐     │  Classifier │     ┌──────┴───────┐
 *   │ Popup/Panel │◀───▶│  Buffer     │◀────│ Suggestions  │
 *   └─────────────┘     │  Recorder   │     └──────────────┘
 *                        └─────────────┘
 */

import { ChromePlatform } from '../platform/chrome.js';
import type { Platform } from '../platform/platform.js';
import type { ConnectionStatus, ExtensionState, AuthState } from '../shared/types.js';
import type { ContentMessage, UIRequest, UIMessage } from '../shared/messages.js';
import type { InboundProtocolMessage } from '../shared/protocol.js';
import { createContextUpdate, createEnvelope } from '../shared/protocol.js';
import { BACKGROUND_PING_INTERVAL_MS, EXTENSION_VERSION } from '../shared/constants.js';
import { ConnectionManager } from './connection.js';
import { AuthManager } from './auth.js';
import { TabRegistry } from './tab-registry.js';
import { Classifier } from './classifier.js';
import { ContextBuffer } from './context-buffer.js';
import { BackpressureManager } from './backpressure.js';
import { PrivacyFilter } from './privacy.js';
import { WorkflowRecorder } from './workflow-recorder.js';
import { diffContent } from './diff-engine.js';
import { safeStringify } from '../lib/serializer.js';

// --- Detect platform ---
// Build-time dead code elimination: esbuild replaces process.env.BROWSER
// with a string literal at compile time, then tree-shakes the dead branch.
// Chrome build: `'chrome' === 'firefox'` → false → FirefoxPlatform import removed
// Firefox build: `'firefox' === 'firefox'` → true → ChromePlatform import removed
import { FirefoxPlatform } from '../platform/firefox.js';

const platform: Platform = process.env.BROWSER === 'firefox'
  ? new FirefoxPlatform()
  : new ChromePlatform();

// --- Initialize modules ---
const tabRegistry = new TabRegistry();
const classifier = new Classifier(platform);
const contextBuffer = new ContextBuffer(platform);
const backpressure = new BackpressureManager();
const privacyFilter = new PrivacyFilter(platform);
let sessionId = crypto.randomUUID();
let sequence = 0;
let isPaused = false;
let backgroundPingTimer: ReturnType<typeof setInterval> | null = null;

const connection = new ConnectionManager({
  onStatusChange: handleConnectionStatusChange,
  onMessage: handleServerMessage,
});

const authManager = new AuthManager(platform, {
  onAuthChange: handleAuthChange,
});

const workflowRecorder = new WorkflowRecorder(platform, (pattern) => {
  // New workflow pattern detected — notify UI
  broadcastToUI({
    type: 'NOTIFICATION',
    title: 'Workflow detected',
    body: `I noticed you often visit: ${pattern.name}. Want me to summarize these for you?`,
    level: 'info',
  });
});

// --- State management ---

function getState(): ExtensionState {
  return {
    connection: connection.getStatus(),
    auth: null, // Don't expose full auth state to UI
    tabs: tabRegistry.getAll(),
    activeTabId: tabRegistry.getActiveTabId(),
    offlineQueueDepth: contextBuffer.depth,
    isPaused,
    backpressureRate: backpressure.getEffectiveRate(),
    extensionVersion: EXTENSION_VERSION,
  };
}

function broadcastToUI(message: UIMessage): void {
  try {
    chrome.runtime.sendMessage(message).catch(() => {
      // No UI listening (popup/sidepanel closed) — expected, ignore
    });
  } catch {
    // Extension context invalidated — ignore
  }
}

function broadcastStateUpdate(): void {
  broadcastToUI({ type: 'STATE_UPDATE', state: getState() });
}

// --- Connection handlers ---

function handleConnectionStatusChange(status: ConnectionStatus): void {
  if (status === 'connected') {
    // Flush offline queue
    const queued = contextBuffer.drain();
    for (const msg of queued) {
      connection.send(msg);
    }
    // Update badge
    platform.setBadge('', '#10b981');
  } else if (status === 'reconnecting') {
    platform.setBadge('...', '#f59e0b');
  } else if (status === 'disconnected') {
    platform.setBadge('OFF', '#6b7280');
  }
  broadcastStateUpdate();

  // Push overlay update to all tabs so the status bar reflects connection state
  const isConn = status === 'connected';
  const counts = tabRegistry.getCounts();
  for (const tab of tabRegistry.getAll()) {
    platform.sendToTab(tab.tabId, {
      type: 'OVERLAY_UPDATE',
      isStreaming: tab.classification.classification === 'allowed' && isConn && !isPaused,
      isConnected: isConn,
      domain: tab.classification.domain,
      tabCount: counts.total,
    });
  }
}

function handleServerMessage(message: InboundProtocolMessage): void {
  switch (message.type) {
    case 'suggestion':
      broadcastToUI({
        type: 'SUGGESTION',
        suggestion: {
          id: message.id,
          title: message.payload.title,
          body: message.payload.body,
          actions: message.payload.actions,
          priority: message.payload.priority,
          relatedTabId: message.payload.related_tab_id,
        },
      });
      // Flash badge for suggestion
      platform.setBadge('!', '#f97316');
      setTimeout(() => {
        if (connection.isConnected()) platform.setBadge('', '#10b981');
      }, 3000);
      break;

    case 'chat_response':
      broadcastToUI({
        type: 'CHAT_RESPONSE',
        message: {
          id: message.id,
          conversationId: message.payload.conversation_id,
          role: 'assistant',
          text: message.payload.text,
          timestamp: message.timestamp,
        },
      });
      break;

    case 'snapshot_request':
      // Server wants a full snapshot of a tab
      platform.sendToTab(message.payload.tab_id, { type: 'REQUEST_SNAPSHOT' });
      break;

    case 'backpressure':
      if (message.payload.action === 'slow_down') {
        backpressure.applyServerBackpressure(message.payload.max_rate_per_minute);
      } else {
        backpressure.clearServerBackpressure();
      }
      broadcastStateUpdate();
      break;
  }
}

// --- Auth handlers ---

function handleAuthChange(auth: AuthState | null): void {
  if (auth) {
    connection.connect(auth);
    privacyFilter.logAuthEvent(`Connected via ${auth.method} to ${auth.instanceUrl}`);
  } else {
    connection.disconnect();
    privacyFilter.logAuthEvent('Disconnected');
  }
  broadcastStateUpdate();
}

// --- Content script message handling ---

async function handleContentMessage(message: ContentMessage, senderTabId?: number): Promise<void> {
  const effectiveTabId = senderTabId ?? message.tabId;

  switch (message.type) {
    case 'CONTENT_SCRIPT_READY': {
      // Send tab ID back to content script
      if (effectiveTabId !== undefined && effectiveTabId > 0) {
        platform.sendToTab(effectiveTabId, { type: 'SET_TAB_ID', tabId: effectiveTabId });
      }
      break;
    }

    case 'PAGE_SNAPSHOT': {
      const snapshot = message.snapshot;

      // Classify the page (runs in SW only — single source of truth)
      const meta = snapshot.meta as unknown as Record<string, unknown>;
      const hasPasswordField = Boolean(meta['_hasPasswordField']);
      const hasCreditCardField = Boolean(meta['_hasCreditCardField']);

      const classification = classifier.classify(snapshot.url, hasPasswordField, hasCreditCardField);

      // Log classification
      privacyFilter.logClassification(classification);

      // Update tab registry
      tabRegistry.upsert(effectiveTabId, snapshot.url, snapshot.title, classification);

      // Send overlay status to the content script on this tab
      const counts = tabRegistry.getCounts();
      platform.sendToTab(effectiveTabId, {
        type: 'OVERLAY_UPDATE',
        isStreaming: classification.classification === 'allowed' && !isPaused,
        isConnected: connection.isConnected(),
        domain: classification.domain,
        tabCount: counts.total,
      });

      // If blocked, log and stop
      if (classification.classification === 'blocked') {
        privacyFilter.logContextBlocked(classification.domain, classification.reason);

        // If blocked by heuristic, prompt user to override
        if (classification.source === 'heuristic_block') {
          broadcastToUI({
            type: 'CLASSIFICATION_PROMPT',
            domain: classification.domain,
            tabId: effectiveTabId,
            url: snapshot.url,
          });
        }
        broadcastStateUpdate();
        return;
      }

      // Check if paused
      if (isPaused) return;

      // Diff against previous snapshot
      const previousContent = tabRegistry.get(effectiveTabId)?.lastSnapshot ?? null;
      const diff = diffContent(previousContent, snapshot.content);

      if (!diff.hasChanged) return;

      // Update stored snapshot
      tabRegistry.updateSnapshot(effectiveTabId, snapshot.content);

      // Sanitize content
      const sanitizedContent = privacyFilter.sanitizeContent(diff.newContent);

      // Check backpressure
      if (!backpressure.canSend()) return;

      // Build protocol message
      sequence++;
      const protocolMessage = createContextUpdate(sessionId, sequence, {
        tab_id: effectiveTabId,
        url: snapshot.url,
        title: snapshot.title,
        content: sanitizedContent,
        site_data: snapshot.siteData,
        meta: snapshot.meta,
        classification: classification.classification,
        is_active_tab: tabRegistry.getActiveTabId() === effectiveTabId,
      });

      // Send or queue
      if (connection.isConnected()) {
        const result = connection.send(protocolMessage);
        if (result.ok) {
          backpressure.recordSend();
          const hash = await privacyFilter.hashContent(sanitizedContent);
          privacyFilter.logContextSent(classification.domain, hash);
        } else {
          contextBuffer.enqueue(protocolMessage);
        }
      } else {
        contextBuffer.enqueue(protocolMessage);
      }

      broadcastStateUpdate();
      break;
    }

    case 'SELECTION_HIGHLIGHT': {
      // User pressed Ctrl+Shift+O with highlighted text
      if (!connection.isConnected()) return;
      if (isPaused) return;

      const highlightMsg = {
        ...createEnvelope('highlight'),
        type: 'highlight' as const,
        payload: {
          tab_id: effectiveTabId,
          url: message.url,
          selected_text: message.text,
          surrounding_context: message.surroundingContext,
          page_title: message.title,
        },
      };

      const serialized = safeStringify(highlightMsg);
      if (serialized.ok) {
        connection.send(highlightMsg);
      }
      break;
    }

    case 'USER_ACTION': {
      // Forward to workflow recorder
      workflowRecorder.recordAction(message.action);

      // Also send to plugin for persistent storage
      if (connection.isConnected()) {
        connection.send({
          ...createEnvelope('user_action'),
          type: 'user_action',
          payload: {
            tab_id: effectiveTabId,
            action: message.action,
          },
        } as any);
      }
      break;
    }
  }
}

// --- UI request handling ---

async function handleUIRequest(request: UIRequest): Promise<unknown> {
  switch (request.type) {
    case 'GET_STATE':
      return getState();

    case 'PAUSE_STREAMING':
      isPaused = true;
      broadcastStateUpdate();
      return { ok: true };

    case 'RESUME_STREAMING':
      isPaused = false;
      broadcastStateUpdate();
      return { ok: true };

    case 'OVERRIDE_CLASSIFICATION':
      await classifier.setOverride(request.domain, request.classification);
      broadcastStateUpdate();
      return { ok: true };

    case 'TEACH_DOMAIN':
      await classifier.teachDomain(request.domain, request.isWorkTool);
      // Re-classify all tabs with the new override so UI updates immediately
      for (const tab of tabRegistry.getAll()) {
        const newClassification = classifier.classify(tab.url);
        tabRegistry.upsert(tab.tabId, tab.url, tab.title, newClassification);
      }
      // Request fresh snapshot from affected tabs so content starts streaming
      for (const tab of tabRegistry.getAll()) {
        if (tab.classification.classification === 'allowed') {
          platform.sendToTab(tab.tabId, { type: 'REQUEST_SNAPSHOT' });
        }
      }
      broadcastStateUpdate();
      return { ok: true };

    case 'START_AUTH':
      if (request.method === 'oauth') {
        return authManager.startOAuth(request.instanceUrl ?? '');
      } else {
        return authManager.startApiKey(request.instanceUrl ?? '', request.apiKey ?? '');
      }

    case 'DISCONNECT':
      connection.disconnect();
      await authManager.clearAuth();
      return { ok: true };

    case 'SEND_CHAT': {
      if (!connection.isConnected()) return { ok: false, error: 'Not connected' };
      const activeTab = tabRegistry.getActiveTab();
      const chatMsg = {
        ...createEnvelope('chat_message'),
        type: 'chat_message' as const,
        payload: {
          conversation_id: request.conversationId ?? crypto.randomUUID(),
          text: request.text,
          current_tab_context: activeTab
            ? { url: activeTab.url, title: activeTab.title }
            : null,
        },
      };
      connection.send(chatMsg);
      return { ok: true };
    }

    case 'TOGGLE_DEBUG_OVERLAY':
      platform.sendToTab(request.tabId, {
        type: 'TOGGLE_DEBUG_OVERLAY',
        enabled: request.enabled,
        isStreaming: tabRegistry.get(request.tabId)?.classification.classification === 'allowed',
      });
      return { ok: true };

    case 'REQUEST_SNAPSHOT':
      platform.sendToTab(request.tabId, { type: 'REQUEST_SNAPSHOT' });
      return { ok: true };
  }
}

// --- Background tab pings ---

function startBackgroundPings(): void {
  if (backgroundPingTimer) clearInterval(backgroundPingTimer);

  backgroundPingTimer = setInterval(() => {
    if (!connection.isConnected() || isPaused) return;

    const backgroundTabs = tabRegistry.getBackgroundTabs();
    if (backgroundTabs.length === 0) return;

    const pingMsg = {
      ...createEnvelope('tab_ping'),
      type: 'tab_ping' as const,
      payload: {
        tabs: backgroundTabs.map((t) => ({
          tab_id: t.tabId,
          url: t.url,
          title: t.title,
        })),
      },
    };

    connection.send(pingMsg);
  }, BACKGROUND_PING_INTERVAL_MS);
}

// --- Context menu setup ---

function setupContextMenu(): void {
  // Remove existing menu items first to prevent duplicate ID error on service worker restart
  try { chrome.contextMenus.removeAll(); } catch { /* Firefox uses different API */ }
  platform.createContextMenu({
    id: 'ask-openclaw',
    title: 'Ask OpenClaw about this',
    contexts: ['selection', 'link', 'page'],
  });

  platform.onContextMenuClick((info, tabId) => {
    if (info.menuItemId !== 'ask-openclaw') return;
    if (!connection.isConnected()) return;

    const contextMenuMsg = {
      ...createEnvelope('context_menu_action'),
      type: 'context_menu_action' as const,
      payload: {
        tab_id: tabId ?? -1,
        url: info.pageUrl ?? '',
        element_text: info.selectionText ?? '',
        element_type: info.linkUrl ? 'link' : 'text',
        link_url: info.linkUrl ?? null,
        surrounding_context: info.selectionText ?? '',
        page_title: '', // Would need to query tab for this
      },
    };

    connection.send(contextMenuMsg);
  });
}

// --- Keyboard shortcut handler ---

function setupCommands(): void {
  platform.onCommand(async (command) => {
    if (command !== 'send-highlight') return;

    const tabResult = await platform.getActiveTab();
    if (!tabResult.ok) return;

    const { tabId: activeTabId } = tabResult.value;

    // Get stored selection from content script
    try {
      const selection = await platform.sessionStorage.get<{ text: string; context: string }>(
        `selection_${activeTabId}`,
      );

      if (selection && selection.text) {
        handleContentMessage({
          type: 'SELECTION_HIGHLIGHT',
          tabId: activeTabId,
          text: selection.text,
          surroundingContext: selection.context,
          url: tabResult.value.url,
          title: tabResult.value.title,
        });
      }
    } catch {
      // Storage access failed — skip
    }
  });
}

// --- Tab event handlers ---

function setupTabListeners(): void {
  platform.onTabActivated((tabId) => {
    tabRegistry.activate(tabId);
    // Request fresh snapshot from newly activated tab
    platform.sendToTab(tabId, { type: 'REQUEST_SNAPSHOT' });
    broadcastStateUpdate();
  });

  platform.onTabRemoved((tabId) => {
    tabRegistry.remove(tabId);
    broadcastStateUpdate();
  });

  platform.onNavigationCommitted((tabId, url) => {
    // Page navigation — content script will re-extract
    // Just note the URL change in the registry
    const tab = tabRegistry.get(tabId);
    if (tab) {
      const classification = classifier.classify(url);
      tabRegistry.upsert(tabId, url, tab.title, classification);
    }
  });
}

// --- Message router ---

platform.onMessage((message, sender, sendResponse) => {
  const msg = message as ContentMessage | UIRequest;
  const msgType = (msg as { type: string }).type;

  // UI-type requests can come from content scripts too (e.g., Allow/Block button in overlay)
  const uiRequestTypes = ['GET_STATE', 'PAUSE_STREAMING', 'RESUME_STREAMING',
    'OVERRIDE_CLASSIFICATION', 'TEACH_DOMAIN', 'START_AUTH', 'DISCONNECT',
    'SEND_CHAT', 'TOGGLE_DEBUG_OVERLAY', 'REQUEST_SNAPSHOT'];

  if (uiRequestTypes.includes(msgType)) {
    handleUIRequest(msg as UIRequest)
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error('[ServiceWorker] UI request failed:', error);
        sendResponse({ ok: false, error: String(error) });
      });
    return;
  }

  // Content script messages have a tabId in sender
  if (sender.tabId) {
    handleContentMessage(msg as ContentMessage, sender.tabId);
    return;
  }

  // Fallback: treat as UI request
  handleUIRequest(msg as UIRequest)
    .then((response) => {
      sendResponse(response);
    })
    .catch((error) => {
      console.error('[ServiceWorker] UI request failed:', error);
      sendResponse({ ok: false, error: String(error) });
    });
});

// --- Wake handler (Chrome SW lifecycle) ---

platform.onWake(async () => {
  // SW just woke up — restore state and reconnect
  sessionId = crypto.randomUUID();
  sequence = 0;

  try {
    await Promise.all([
      classifier.loadOverrides(),
      contextBuffer.load(),
      privacyFilter.loadAuditLog(),
      workflowRecorder.load(),
    ]);
  } catch (e) {
    console.error('[ServiceWorker] Failed to restore state on wake:', e);
  }

  // Try to restore tab registry from storage
  const storedRegistry = await platform.sessionStorage.get<string>('tabRegistry');
  if (storedRegistry) {
    tabRegistry.deserialize(storedRegistry);
  }

  // Reconnect if we have stored auth
  const auth = await authManager.loadStored();
  if (auth) {
    connection.connect(auth);
  }

  startBackgroundPings();
});

// --- Initialization ---

async function init(): Promise<void> {
  try {
    await Promise.all([
      classifier.loadOverrides(),
      contextBuffer.load(),
      privacyFilter.loadAuditLog(),
      workflowRecorder.load(),
    ]);
  } catch (e) {
    console.error('[ServiceWorker] Failed to initialize state:', e);
  }

  setupContextMenu();
  setupCommands();
  setupTabListeners();
  startBackgroundPings();

  // Load stored auth and connect
  const auth = await authManager.loadStored();
  if (auth) {
    connection.connect(auth);
  } else {
    platform.setBadge('SET', '#6b7280');
  }

  // Periodically persist tab registry (Chrome SW can die)
  setInterval(() => {
    platform.sessionStorage.set('tabRegistry', tabRegistry.serialize());
  }, 10_000);

  console.log('[OpenClaw Extension] Service worker initialized');
}

init();
