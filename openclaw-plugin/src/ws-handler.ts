/**
 * WebSocket connection handler — manages a single extension connection.
 *
 * Handles the full protocol lifecycle:
 *   1. Auth (Bearer token in upgrade request)
 *   2. Message routing (context, chat, highlight, ping)
 *   3. Suggestion delivery (server → client)
 *   4. Backpressure signaling
 *   5. Graceful disconnect
 *
 *   Extension ──ws──▶ WSHandler ──emit──▶ EventPipeline
 *                         │                    │──▶ ContactProcessor
 *                         │                    │──▶ InteractionProcessor
 *                         │                    │──▶ SuggestionEngine
 *                         │──▶ ContextStore (state)
 *                         │──▶ GatewayClient (OpenClaw API)
 *                         │◀── Suggestions (push to extension)
 */

import type { WebSocket } from 'ws';
import type {
  InboundMessage,
  OutboundMessage,
  ContextUpdateMessage,
  TabPingMessage,
  HighlightMessage,
  ContextMenuActionMessage,
  ChatMessageInbound,
} from './types.js';
import type { ContextStore } from './context-store.js';
import type { GatewayClient } from './gateway-client.js';
import type { ContextDatabase } from './database.js';
import type { EventPipeline } from './event-pipeline.js';
import { utcTimestamp } from './utc-timestamp.js';

const MAX_RATE_PER_MINUTE = 30;
const RATE_WINDOW_MS = 60_000;

export class WSHandler {
  private ws: WebSocket;
  private sessionId: string | null = null;
  private contextStore: ContextStore;
  private database: ContextDatabase;
  private gateway: GatewayClient;
  private pipeline: EventPipeline;
  private messageTimestamps: number[] = [];
  private backpressureActive = false;
  private memoryWriteTimer: ReturnType<typeof setTimeout> | null = null;
  private memoryWriteDirty = false;
  private lastVisitId = new Map<number, number>(); // tabId → visitId

  constructor(
    ws: WebSocket,
    contextStore: ContextStore,
    database: ContextDatabase,
    gateway: GatewayClient,
    pipeline: EventPipeline,
  ) {
    this.ws = ws;
    this.contextStore = contextStore;
    this.database = database;
    this.gateway = gateway;
    this.pipeline = pipeline;

    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (err) => {
      console.error(`[${utcTimestamp()}] [WSHandler] WebSocket error:`, err.message);
    });
  }

  /** Send a message to the extension */
  send(message: OutboundMessage): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /** Get the session ID for this connection */
  getSessionId(): string | null {
    return this.sessionId;
  }

  private handleMessage(data: unknown): void {
    let message: InboundMessage;
    try {
      message = JSON.parse(String(data)) as InboundMessage;
    } catch {
      console.warn(`[${utcTimestamp()}] [WSHandler] Malformed message, skipping`);
      return;
    }

    // Rate limiting
    if (this.isRateLimited()) {
      if (!this.backpressureActive) {
        this.backpressureActive = true;
        this.send({
          protocol_version: '1.0',
          type: 'backpressure',
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          payload: {
            action: 'slow_down',
            max_rate_per_minute: MAX_RATE_PER_MINUTE / 2,
            reason: 'Rate limit exceeded',
          },
        });
      }
      return;
    }

    if (this.backpressureActive) {
      this.backpressureActive = false;
      this.send({
        protocol_version: '1.0',
        type: 'backpressure',
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {
          action: 'resume',
          max_rate_per_minute: MAX_RATE_PER_MINUTE,
          reason: 'Rate limit cleared',
        },
      });
    }

    this.recordMessage();

    switch (message.type) {
      case 'ping':
        this.handlePing();
        break;
      case 'context_update':
      case 'context_snapshot':
        this.handleContextUpdate(message as ContextUpdateMessage);
        break;
      case 'tab_ping':
        this.handleTabPing(message as TabPingMessage);
        break;
      case 'highlight':
        this.handleHighlight(message as HighlightMessage);
        break;
      case 'context_menu_action':
        this.handleContextMenu(message as ContextMenuActionMessage);
        break;
      case 'user_action':
        this.handleUserAction(message as import('./types.js').UserActionMessage);
        break;
      case 'chat_message':
        this.handleChat(message as ChatMessageInbound);
        break;
      default:
        console.warn(`[${utcTimestamp()}] [WSHandler] Unknown message type:`, (message as { type: string }).type);
    }
  }

  private handlePing(): void {
    this.send({
      protocol_version: '1.0',
      type: 'pong',
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
  }

  private handleContextUpdate(msg: ContextUpdateMessage): void {
    // Initialize session on first message
    if (!this.sessionId) {
      this.sessionId = msg.session_id;
      this.contextStore.getOrCreateSession(msg.session_id, msg.extension_version);
      console.log(`[${utcTimestamp()}] [WSHandler] Session started: ${msg.session_id} (ext v${msg.extension_version})`);
    }

    // Log what we received
    const contentPreview = msg.payload.content.slice(0, 80).replace(/\n/g, ' ');
    console.log(`[${utcTimestamp()}] [STREAM] ${msg.payload.is_active_tab ? '★' : '·'} ${msg.payload.title}`);
    console.log(`[${utcTimestamp()}]          URL: ${msg.payload.url}`);
    console.log(`[${utcTimestamp()}]          Content: ${contentPreview}${msg.payload.content.length > 80 ? '...' : ''} (${msg.payload.content.length} chars)`);
    if (msg.payload.site_data) {
      console.log(`[${utcTimestamp()}]          Site: ${msg.payload.site_data.siteName} → ${msg.payload.site_data.entityType}`);
      console.log(`[${utcTimestamp()}]          Data: ${JSON.stringify(msg.payload.site_data.data).slice(0, 120)}`);
    }

    // Store context in-memory (instant, used for chat/highlight)
    this.contextStore.updateTab(msg.session_id, msg.payload, msg.sequence);

    // Persist to SQLite (survives restarts, queryable)
    let currentVisitId: number | undefined;
    try {
      this.database.upsertSession(msg.session_id, msg.extension_version);
      currentVisitId = this.database.insertVisit({
        sessionId: msg.session_id,
        tabId: msg.payload.tab_id,
        url: msg.payload.url,
        title: msg.payload.title,
        content: msg.payload.content,
        siteName: msg.payload.site_data?.siteName,
        siteEntityType: msg.payload.site_data?.entityType,
        siteDataJson: msg.payload.site_data ? JSON.stringify(msg.payload.site_data.data) : undefined,
        isActive: msg.payload.is_active_tab,
      });
      this.lastVisitId.set(msg.payload.tab_id, currentVisitId);
    } catch (e) {
      console.warn(`[${utcTimestamp()}] [WSHandler] DB write failed:`, e);
    }

    // Emit to event pipeline — processors handle contact extraction, suggestions, etc.
    this.pipeline.emit({
      type: 'context_update',
      sessionId: msg.session_id,
      visitId: currentVisitId,
      payload: msg.payload,
      sequence: msg.sequence,
      extensionVersion: msg.extension_version,
    });
  }

  private handleUserAction(msg: import('./types.js').UserActionMessage): void {
    if (!this.sessionId) return;
    const action = msg.payload.action;
    const visitId = this.lastVisitId.get(msg.payload.tab_id);

    // Emit to event pipeline — InteractionProcessor records to DB
    this.pipeline.emit({
      type: 'user_action',
      sessionId: this.sessionId,
      tabId: msg.payload.tab_id,
      action,
      visitId,
    });
  }

  private handleTabPing(msg: TabPingMessage): void {
    if (!this.sessionId) return;
    console.log(`[${utcTimestamp()}] [PING] ${msg.payload.tabs.length} background tabs: ${msg.payload.tabs.map(t => t.title).join(', ')}`);
    this.contextStore.updateTabPings(this.sessionId, msg.payload.tabs);
  }

  private async handleHighlight(msg: HighlightMessage): Promise<void> {
    if (!this.sessionId) return;
    console.log(`[${utcTimestamp()}] [HIGHLIGHT] "${msg.payload.selected_text.slice(0, 60)}" on ${msg.payload.page_title}`);

    const context = this.contextStore.buildContextSummary(this.sessionId);
    const prompt = `The user highlighted the following text and wants your attention on it:\n\n"${msg.payload.selected_text}"\n\nFrom page: ${msg.payload.page_title} (${msg.payload.url})\n\nSurrounding context: ${msg.payload.surrounding_context}`;

    const result = await this.gateway.sendDirectMessage(prompt, context);

    if (result.ok && result.response) {
      this.send({
        protocol_version: '1.0',
        type: 'chat_response',
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {
          conversation_id: crypto.randomUUID(),
          text: result.response,
          in_reply_to: msg.id,
        },
      });
    }
  }

  private async handleContextMenu(msg: ContextMenuActionMessage): Promise<void> {
    if (!this.sessionId) return;

    const context = this.contextStore.buildContextSummary(this.sessionId);
    const elementDesc = msg.payload.link_url
      ? `a link to ${msg.payload.link_url} with text "${msg.payload.element_text}"`
      : `"${msg.payload.element_text}"`;

    const prompt = `The user right-clicked on ${elementDesc} on page "${msg.payload.page_title}" (${msg.payload.url}) and asked "Ask OpenClaw about this." Please help them understand or act on what they selected.`;

    const result = await this.gateway.sendDirectMessage(prompt, context);

    if (result.ok && result.response) {
      this.send({
        protocol_version: '1.0',
        type: 'chat_response',
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {
          conversation_id: crypto.randomUUID(),
          text: result.response,
          in_reply_to: msg.id,
        },
      });
    }
  }

  private async handleChat(msg: ChatMessageInbound): Promise<void> {
    if (!this.sessionId) return;

    const context = this.contextStore.buildContextSummary(this.sessionId);
    const result = await this.gateway.sendConversationMessage(
      msg.payload.conversation_id,
      msg.payload.text,
      context,
    );

    if (result.ok && result.response) {
      this.send({
        protocol_version: '1.0',
        type: 'chat_response',
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {
          conversation_id: msg.payload.conversation_id,
          text: result.response,
          in_reply_to: msg.id,
        },
      });
    }
  }

  private handleClose(): void {
    // Flush pending memory write on disconnect
    if (this.sessionId && this.memoryWriteDirty) {
      this.flushMemoryWrite(this.sessionId);
    }
    if (this.memoryWriteTimer) {
      clearTimeout(this.memoryWriteTimer);
      this.memoryWriteTimer = null;
    }
    if (this.sessionId) {
      console.log(`[${utcTimestamp()}] [WSHandler] Session ended: ${this.sessionId}`);
    }
  }

  /** Debounced write to OpenClaw memory — at most once every 30s */
  private scheduleMemoryWrite(sessionId: string): void {
    this.memoryWriteDirty = true;
    if (this.memoryWriteTimer) return; // already scheduled
    this.memoryWriteTimer = setTimeout(() => {
      this.memoryWriteTimer = null;
      if (this.memoryWriteDirty) {
        this.flushMemoryWrite(sessionId);
      }
    }, 30_000);
  }

  private flushMemoryWrite(sessionId: string): void {
    this.memoryWriteDirty = false;
    const summary = this.contextStore.buildContextSummary(sessionId);
    console.log(`[${utcTimestamp()}] [MEMORY] Flushing context to OpenClaw (${summary.length} chars)`);
    this.gateway.storeContextMemory(sessionId, summary).then((result) => {
      if (result.ok) {
        console.log(`[${utcTimestamp()}] [MEMORY] ✅ Stored in OpenClaw`);
      } else {
        console.warn(`[${utcTimestamp()}] [MEMORY] ❌ Failed: ${result.error}`);
      }
    }).catch((err) => {
      console.warn(`[${utcTimestamp()}] [MEMORY] ❌ Failed to store context:`, err);
    });
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    this.messageTimestamps = this.messageTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
    return this.messageTimestamps.length >= MAX_RATE_PER_MINUTE;
  }

  private recordMessage(): void {
    this.messageTimestamps.push(Date.now());
  }
}
