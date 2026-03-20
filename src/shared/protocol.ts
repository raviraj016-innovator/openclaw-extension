import type { SiteData, PageMeta } from './types.js';
import { PROTOCOL_VERSION, EXTENSION_VERSION } from './constants.js';

// --- Envelope ---
interface MessageEnvelope {
  protocol_version: string;
  type: string;
  id: string;
  timestamp: string;
}

// --- Client → Server ---

export interface ContextUpdateMessage extends MessageEnvelope {
  type: 'context_update';
  session_id: string;
  sequence: number;
  extension_version: string;
  payload: {
    tab_id: number;
    url: string;
    title: string;
    content: string;
    site_data: SiteData | null;
    meta: PageMeta;
    classification: string;
    is_active_tab: boolean;
  };
}

export interface ContextSnapshotMessage extends MessageEnvelope {
  type: 'context_snapshot';
  session_id: string;
  sequence: number;
  extension_version: string;
  payload: ContextUpdateMessage['payload'];
}

export interface TabPingMessage extends MessageEnvelope {
  type: 'tab_ping';
  payload: {
    tabs: Array<{ tab_id: number; url: string; title: string }>;
  };
}

export interface HighlightMessage extends MessageEnvelope {
  type: 'highlight';
  payload: {
    tab_id: number;
    url: string;
    selected_text: string;
    surrounding_context: string;
    page_title: string;
  };
}

export interface ContextMenuActionMessage extends MessageEnvelope {
  type: 'context_menu_action';
  payload: {
    tab_id: number;
    url: string;
    element_text: string;
    element_type: string;
    link_url: string | null;
    surrounding_context: string;
    page_title: string;
  };
}

export interface ChatMessageOutbound extends MessageEnvelope {
  type: 'chat_message';
  payload: {
    conversation_id: string;
    text: string;
    current_tab_context: { url: string; title: string } | null;
  };
}

export interface PingMessage extends MessageEnvelope {
  type: 'ping';
}

export type OutboundProtocolMessage =
  | ContextUpdateMessage
  | ContextSnapshotMessage
  | TabPingMessage
  | HighlightMessage
  | ContextMenuActionMessage
  | ChatMessageOutbound
  | PingMessage;

// --- Server → Client ---

export interface SuggestionMessage extends MessageEnvelope {
  type: 'suggestion';
  payload: {
    title: string;
    body: string;
    actions: Array<{ label: string; url?: string; action?: string }>;
    priority: 'low' | 'normal' | 'high';
    related_tab_id: number | null;
  };
}

export interface ChatResponseMessage extends MessageEnvelope {
  type: 'chat_response';
  payload: {
    conversation_id: string;
    text: string;
    in_reply_to: string;
  };
}

export interface SnapshotRequestMessage extends MessageEnvelope {
  type: 'snapshot_request';
  payload: {
    tab_id: number;
  };
}

export interface BackpressureMessage extends MessageEnvelope {
  type: 'backpressure';
  payload: {
    action: 'slow_down' | 'resume';
    max_rate_per_minute: number;
    reason: string;
  };
}

export interface PongMessage extends MessageEnvelope {
  type: 'pong';
}

export type InboundProtocolMessage =
  | SuggestionMessage
  | ChatResponseMessage
  | SnapshotRequestMessage
  | BackpressureMessage
  | PongMessage;

// --- Helpers ---

export function createMessageId(): string {
  return crypto.randomUUID();
}

export function createEnvelope(type: string): MessageEnvelope {
  return {
    protocol_version: PROTOCOL_VERSION,
    type,
    id: createMessageId(),
    timestamp: new Date().toISOString(),
  };
}

export function createContextUpdate(
  sessionId: string,
  sequence: number,
  payload: ContextUpdateMessage['payload'],
): ContextUpdateMessage {
  return {
    ...createEnvelope('context_update'),
    type: 'context_update',
    session_id: sessionId,
    sequence,
    extension_version: EXTENSION_VERSION,
    payload,
  };
}

export function createPing(): PingMessage {
  return {
    ...createEnvelope('ping'),
    type: 'ping',
  };
}
