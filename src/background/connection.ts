/**
 * WebSocket connection manager.
 *
 * Handles connecting to OpenClaw Gateway, reconnection with jittered
 * exponential backoff, keepalive pings, and message send/receive.
 *
 *   ┌──────────────┐   connect()   ┌──────────────┐
 *   │ DISCONNECTED │──────────────▶│  CONNECTING   │
 *   └──────┬───────┘               └──────┬───────┘
 *          │                               │
 *          │         onclose/onerror       │  onopen
 *          │◀──────────────────────────────│
 *          │                               ▼
 *   ┌──────┴───────┐               ┌──────────────┐
 *   │ RECONNECTING │◀──────────────│  CONNECTED    │
 *   └──────────────┘   onclose     └──────────────┘
 *          │
 *          │ backoff timer fires
 *          ▼
 *   ┌──────────────┐
 *   │  CONNECTING   │  (retry)
 *   └──────────────┘
 */

import type { ConnectionStatus, AuthState } from '../shared/types.js';
import type { OutboundProtocolMessage, InboundProtocolMessage } from '../shared/protocol.js';
import { createPing } from '../shared/protocol.js';
import {
  RECONNECT_BASE_MS,
  RECONNECT_MAX_MS,
  KEEPALIVE_INTERVAL_MS,
} from '../shared/constants.js';
import { ok, err, type Result } from '../shared/result.js';

export type ConnectionListener = {
  onStatusChange: (status: ConnectionStatus) => void;
  onMessage: (message: InboundProtocolMessage) => void;
};

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private auth: AuthState | null = null;
  private listener: ConnectionListener;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectLock = false;

  constructor(listener: ConnectionListener) {
    this.listener = listener;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  connect(auth: AuthState): void {
    this.auth = auth;
    this.reconnectAttempt = 0;
    this.doConnect();
  }

  disconnect(): void {
    this.clearTimers();
    this.reconnectLock = false;
    this.reconnectAttempt = 0;
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect on intentional close
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  send(message: OutboundProtocolMessage): Result<void, Error> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return err(new Error('WebSocket not connected'));
    }
    try {
      this.ws.send(JSON.stringify(message));
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  private doConnect(): void {
    if (this.reconnectLock) return;
    if (!this.auth) return;

    this.reconnectLock = true;
    this.setStatus(this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting');

    const wsUrl = this.buildWsUrl(this.auth.instanceUrl, this.auth.token);

    try {
      this.ws = new WebSocket(wsUrl, ['openclaw-context-v1']);
    } catch (e) {
      this.reconnectLock = false;
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectLock = false;
      this.reconnectAttempt = 0;
      this.setStatus('connected');
      this.startKeepalive();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as InboundProtocolMessage;
        if (message.type === 'pong') return; // keepalive response, ignore
        this.listener.onMessage(message);
      } catch {
        // Malformed JSON from server — log and skip, never crash
        console.warn('[ConnectionManager] Malformed message from server:', event.data);
      }
    };

    this.ws.onclose = () => {
      this.reconnectLock = false;
      this.stopKeepalive();
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onerror is always followed by onclose — no action needed here
    };
  }

  private scheduleReconnect(): void {
    if (!this.auth) {
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempt++;

    // Jittered exponential backoff: base * 2^attempt + random jitter
    const baseDelay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt - 1),
      RECONNECT_MAX_MS,
    );
    const jitter = Math.random() * baseDelay;
    const delay = baseDelay + jitter;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, delay);
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send(createPing());
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  private clearTimers(): void {
    this.stopKeepalive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.listener.onStatusChange(status);
    }
  }

  private buildWsUrl(instanceUrl: string, token: string): string {
    const url = new URL(instanceUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.host}/ws/extension?token=${encodeURIComponent(token)}`;
  }
}
