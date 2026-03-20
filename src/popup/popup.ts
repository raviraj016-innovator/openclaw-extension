/**
 * Popup UI — thin stateless renderer.
 *
 * Requests state from service worker on open, subscribes to updates.
 * All state lives in the service worker.
 */

import type { ExtensionState } from '../shared/types.js';
import type { UIRequest, UIMessage } from '../shared/messages.js';


// --- DOM elements ---
const statusDot = document.getElementById('status-dot')!;
const statusText = document.getElementById('status-text')!;
const greeting = document.getElementById('greeting')!;
const setupPanel = document.getElementById('setup-panel')!;
const connectedPanel = document.getElementById('connected-panel')!;
const tabAllowed = document.getElementById('tab-allowed')!;
const tabBlocked = document.getElementById('tab-blocked')!;
const queueDepth = document.getElementById('queue-depth')!;
const btnPause = document.getElementById('btn-pause')!;
const btnSidepanel = document.getElementById('btn-sidepanel')!;
const btnDisconnect = document.getElementById('btn-disconnect')!;
const btnOauth = document.getElementById('btn-oauth')!;
const btnApikey = document.getElementById('btn-apikey')!;
const apikeyForm = document.getElementById('apikey-form')!;
const inputUrl = document.getElementById('input-url') as HTMLInputElement;
const inputKey = document.getElementById('input-key') as HTMLInputElement;
const btnConnect = document.getElementById('btn-connect')!;
const teachPrompt = document.getElementById('teach-prompt')!;
const teachDomain = document.getElementById('teach-domain')!;
const btnTeachYes = document.getElementById('btn-teach-yes')!;
const btnTeachNo = document.getElementById('btn-teach-no')!;

let currentState: ExtensionState | null = null;
let pendingTeachDomain: string | null = null;

// --- Send request to service worker ---
function sendRequest(request: UIRequest): void {
  try {
    chrome.runtime.sendMessage(request).catch(() => {
      // Service worker unavailable — extension context invalidated
    });
  } catch {
    // Synchronous error — extension context invalidated
  }
}

// --- Render state ---
function render(state: ExtensionState): void {
  currentState = state;

  // Connection status
  const statusMap: Record<string, { dot: string; text: string }> = {
    connected: { dot: 'connected', text: 'Connected' },
    connecting: { dot: 'connecting', text: 'Connecting...' },
    reconnecting: { dot: 'connecting', text: 'Reconnecting...' },
    disconnected: { dot: 'disconnected', text: 'Disconnected' },
  };

  const status = statusMap[state.connection] ?? statusMap['disconnected']!;
  statusDot.className = `status-dot ${status.dot}`;
  statusText.textContent = status.text;

  // Greeting with personality
  const hour = new Date().getHours();
  const tabCount = state.tabs.length;
  if (hour < 12) {
    greeting.textContent = `Good morning — OpenClaw is watching ${tabCount} tab${tabCount !== 1 ? 's' : ''}`;
  } else if (hour < 17) {
    greeting.textContent = `Good afternoon — ${tabCount} tab${tabCount !== 1 ? 's' : ''} in view`;
  } else if (hour < 22) {
    greeting.textContent = `Good evening — tracking ${tabCount} tab${tabCount !== 1 ? 's' : ''}`;
  } else {
    greeting.textContent = `Late night? OpenClaw has your back on ${tabCount} tab${tabCount !== 1 ? 's' : ''}`;
  }

  // Show setup or connected panel
  if (state.connection === 'disconnected' && !state.auth) {
    setupPanel.style.display = 'block';
    connectedPanel.style.display = 'none';
  } else {
    setupPanel.style.display = 'none';
    connectedPanel.style.display = 'block';
  }

  // Tab stats
  const counts = { allowed: 0, blocked: 0 };
  for (const tab of state.tabs) {
    if (tab.classification.classification === 'allowed') counts.allowed++;
    else counts.blocked++;
  }
  tabAllowed.textContent = String(counts.allowed);
  tabBlocked.textContent = String(counts.blocked);
  queueDepth.textContent = String(state.offlineQueueDepth);

  // Pause button
  btnPause.textContent = state.isPaused ? '▶ Resume' : '⏸ Pause';
}

// --- Event listeners ---

btnPause.addEventListener('click', () => {
  sendRequest({ type: currentState?.isPaused ? 'RESUME_STREAMING' : 'PAUSE_STREAMING' });
});

// Debug overlay is always-on — button removed. Status bar shows on every page automatically.

btnSidepanel.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

btnDisconnect.addEventListener('click', () => {
  sendRequest({ type: 'DISCONNECT' });
});

btnOauth.addEventListener('click', () => {
  sendRequest({ type: 'START_AUTH', method: 'oauth', instanceUrl: 'https://app.openclawcloud.com' });
});

btnApikey.addEventListener('click', () => {
  apikeyForm.style.display = apikeyForm.style.display === 'none' ? 'block' : 'none';
});

btnConnect.addEventListener('click', () => {
  const url = inputUrl.value.trim();
  const key = inputKey.value.trim();
  if (url && key) {
    sendRequest({ type: 'START_AUTH', method: 'api_key', instanceUrl: url, apiKey: key });
  }
});

btnTeachYes.addEventListener('click', () => {
  if (pendingTeachDomain) {
    sendRequest({ type: 'TEACH_DOMAIN', domain: pendingTeachDomain, isWorkTool: true });
    teachPrompt.style.display = 'none';
    pendingTeachDomain = null;
  }
});

btnTeachNo.addEventListener('click', () => {
  if (pendingTeachDomain) {
    sendRequest({ type: 'TEACH_DOMAIN', domain: pendingTeachDomain, isWorkTool: false });
    teachPrompt.style.display = 'none';
    pendingTeachDomain = null;
  }
});

// --- Listen for messages from service worker ---
chrome.runtime.onMessage.addListener((message: UIMessage) => {
  switch (message.type) {
    case 'STATE_UPDATE':
      render(message.state);
      break;

    case 'CLASSIFICATION_PROMPT':
      pendingTeachDomain = message.domain;
      teachDomain.textContent = message.domain;
      teachPrompt.style.display = 'block';
      break;

    case 'NOTIFICATION':
      // Show notification in popup
      greeting.textContent = `${message.title}: ${message.body}`;
      break;
  }
});

// --- Initialize: request current state with response callback ---
try {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response: unknown) => {
    if (response && typeof response === 'object' && 'connection' in response) {
      render(response as ExtensionState);
    }
  });
} catch {
  // Extension context not ready yet
}
