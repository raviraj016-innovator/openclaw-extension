/**
 * Side Panel — persistent chat UI alongside the browser.
 *
 * Stateless renderer. Requests state from service worker,
 * subscribes to updates, displays chat messages and suggestions.
 */

import type { UIMessage, UIRequest } from '../shared/messages.js';
import type { ChatMessage, OpenClawSuggestion, ExtensionState } from '../shared/types.js';


const statusEl = document.getElementById('sp-status')!;
const messagesEl = document.getElementById('chat-messages')!;
const inputEl = document.getElementById('chat-input') as HTMLTextAreaElement;
const sendBtn = document.getElementById('btn-send')!;
const suggestionBanner = document.getElementById('suggestion-banner')!;
const suggestionTitle = document.getElementById('suggestion-title')!;
const suggestionBody = document.getElementById('suggestion-body')!;
const suggestionActions = document.getElementById('suggestion-actions')!;

let conversationId: string | null = null;
const messages: ChatMessage[] = [];

function sendRequest(request: UIRequest): void {
  try {
    chrome.runtime.sendMessage(request).catch(() => {
      // Service worker unavailable — extension context invalidated
    });
  } catch {
    // Synchronous error — extension context invalidated
  }
}

function addMessage(msg: ChatMessage): void {
  messages.push(msg);

  // Clear empty state
  const empty = messagesEl.querySelector('.chat-empty');
  if (empty) empty.remove();

  const el = document.createElement('div');
  el.className = `chat-msg ${msg.role}`;
  el.textContent = msg.text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showSuggestion(suggestion: OpenClawSuggestion): void {
  suggestionTitle.textContent = suggestion.title;
  suggestionBody.textContent = suggestion.body;
  suggestionActions.innerHTML = '';

  for (const action of suggestion.actions) {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      if (action.url) {
        chrome.tabs.create({ url: action.url });
      }
      suggestionBanner.style.display = 'none';
    });
    suggestionActions.appendChild(btn);
  }

  suggestionBanner.style.display = 'block';
}

function updateStatus(state: ExtensionState): void {
  const statusMap: Record<string, string> = {
    connected: '🟢 Connected',
    connecting: '🟡 Connecting...',
    reconnecting: '🟡 Reconnecting...',
    disconnected: '⚫ Disconnected',
  };
  statusEl.textContent = statusMap[state.connection] ?? 'Unknown';
}

// --- Send chat message ---
function sendMessage(): void {
  const text = inputEl.value.trim();
  if (!text) return;

  // Create user message
  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    conversationId: conversationId ?? '',
    role: 'user',
    text,
    timestamp: new Date().toISOString(),
  };
  addMessage(userMsg);

  // Generate conversation ID before sending so local + server use the same ID
  if (!conversationId) {
    conversationId = crypto.randomUUID();
  }

  // Send to service worker
  sendRequest({
    type: 'SEND_CHAT',
    text,
    conversationId,
  });

  inputEl.value = '';
  inputEl.style.height = 'auto';
}

// --- Event listeners ---
sendBtn.addEventListener('click', sendMessage);

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
});

// --- Listen for messages from service worker ---
chrome.runtime.onMessage.addListener((message: UIMessage) => {
  switch (message.type) {
    case 'STATE_UPDATE':
      updateStatus(message.state);
      break;

    case 'CHAT_RESPONSE':
      addMessage(message.message);
      break;

    case 'SUGGESTION':
      showSuggestion(message.suggestion);
      break;
  }
});

// --- Initialize: request current state with response callback ---
try {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response: unknown) => {
    if (response && typeof response === 'object' && 'connection' in response) {
      updateStatus(response as ExtensionState);
    }
  });
} catch {
  // Extension context not ready yet
}
