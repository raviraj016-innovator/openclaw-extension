/**
 * Status bar overlay — always-on fixed bar showing OpenClaw streaming state.
 * Shows "Allow" button when a page is blocked so user can unblock inline.
 */

import browser from 'webextension-polyfill';


const OVERLAY_ID = 'openclaw-debug-overlay-style';
const BANNER_ID = 'openclaw-status-bar';

const OVERLAY_CSS = `
  #${BANNER_ID} {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 28px;
    background: rgba(15, 23, 42, 0.92);
    color: #94a3b8;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 11px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 12px;
    z-index: 2147483647;
    border-top: 1px solid rgba(51, 65, 85, 0.6);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: opacity 0.2s;
  }
  #${BANNER_ID} .oc-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  #${BANNER_ID} .oc-dot.streaming { background: #10b981; box-shadow: 0 0 6px #10b981; }
  #${BANNER_ID} .oc-dot.blocked   { background: #ef4444; }
  #${BANNER_ID} .oc-dot.offline   { background: #6b7280; }
  #${BANNER_ID} .oc-label {
    color: #e2e8f0;
    font-weight: 500;
  }
  #${BANNER_ID} .oc-domain {
    color: #64748b;
  }
  #${BANNER_ID} .oc-right {
    margin-left: auto;
    color: #475569;
  }
  #${BANNER_ID} .oc-allow-btn {
    pointer-events: auto;
    cursor: pointer;
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.4);
    border-radius: 4px;
    padding: 2px 10px;
    font-size: 10px;
    font-weight: 600;
    font-family: inherit;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    transition: all 0.15s;
    margin-left: 8px;
  }
  #${BANNER_ID} .oc-allow-btn:hover {
    background: rgba(16, 185, 129, 0.3);
    border-color: #10b981;
    color: #fff;
  }
  #${BANNER_ID} .oc-block-btn {
    pointer-events: auto;
    cursor: pointer;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 4px;
    padding: 2px 10px;
    font-size: 10px;
    font-weight: 600;
    font-family: inherit;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    transition: all 0.15s;
    margin-left: 8px;
  }
  #${BANNER_ID} .oc-block-btn:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: #ef4444;
    color: #fff;
  }
`;

export type OverlayState = {
  isStreaming: boolean;
  isConnected: boolean;
  domain: string;
  tabCount?: number;
};

let currentState: OverlayState = {
  isStreaming: false,
  isConnected: false,
  domain: '',
};

function ensureInjected(): void {
  if (document.getElementById(OVERLAY_ID)) return;

  const style = document.createElement('style');
  style.id = OVERLAY_ID;
  style.textContent = OVERLAY_CSS;
  (document.head ?? document.documentElement).appendChild(style);
}

function sendAllowDomain(): void {
  try {
    browser.runtime.sendMessage({
      type: 'TEACH_DOMAIN',
      domain: currentState.domain,
      isWorkTool: true,
    });
  } catch { /* extension context invalidated */ }
}

function sendBlockDomain(): void {
  try {
    browser.runtime.sendMessage({
      type: 'TEACH_DOMAIN',
      domain: currentState.domain,
      isWorkTool: false,
    });
  } catch { /* extension context invalidated */ }
}

function render(): void {
  ensureInjected();

  let banner = document.getElementById(BANNER_ID);
  if (!banner) {
    banner = document.createElement('div');
    banner.id = BANNER_ID;
    (document.body ?? document.documentElement).appendChild(banner);
  }

  const { isStreaming, isConnected, domain, tabCount } = currentState;

  const dotClass = !isConnected ? 'offline' : isStreaming ? 'streaming' : 'blocked';
  const statusText = !isConnected
    ? 'Disconnected'
    : isStreaming
      ? 'Streaming'
      : 'Blocked';
  const logo = '🦞';
  const tabInfo = tabCount !== undefined ? `${tabCount} tabs` : '';

  // Show Allow button when blocked, Block button when streaming
  let actionButton = '';
  if (isConnected && !isStreaming) {
    actionButton = `<button class="oc-allow-btn" id="oc-allow-btn">Allow</button>`;
  } else if (isConnected && isStreaming) {
    actionButton = `<button class="oc-block-btn" id="oc-block-btn">Block</button>`;
  }

  banner.innerHTML = `
    <span class="oc-label">${logo} OpenClaw</span>
    <span class="oc-dot ${dotClass}"></span>
    <span class="oc-label">${statusText}</span>
    <span class="oc-domain">${domain}</span>
    ${actionButton}
    <span class="oc-right">${tabInfo}</span>
  `;

  // Wire button click handlers
  const allowBtn = document.getElementById('oc-allow-btn');
  if (allowBtn) {
    allowBtn.addEventListener('click', sendAllowDomain);
  }
  const blockBtn = document.getElementById('oc-block-btn');
  if (blockBtn) {
    blockBtn.addEventListener('click', sendBlockDomain);
  }
}

/** Update the overlay state — called by content script on every classification update */
export function updateOverlay(state: Partial<OverlayState>): void {
  currentState = { ...currentState, ...state };
  render();
}

/** Initial render with current page domain */
export function initOverlay(): void {
  try {
    currentState.domain = location.hostname;
  } catch {
    currentState.domain = '';
  }
  render();
}

/** Remove the overlay entirely */
export function removeOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  document.getElementById(BANNER_ID)?.remove();
}
