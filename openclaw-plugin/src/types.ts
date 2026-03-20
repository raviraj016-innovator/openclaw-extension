/**
 * Protocol types — mirrors the extension's PROTOCOL.md.
 * Kept in sync manually (or share via a common package later).
 */

// --- Envelope ---
export interface MessageEnvelope {
  protocol_version: string;
  type: string;
  id: string;
  timestamp: string;
}

// --- Client → Server (extension sends these) ---

export interface ContextUpdateMessage extends MessageEnvelope {
  type: 'context_update';
  session_id: string;
  sequence: number;
  extension_version: string;
  payload: ContextPayload;
}

export interface ContextSnapshotMessage extends MessageEnvelope {
  type: 'context_snapshot';
  session_id: string;
  sequence: number;
  extension_version: string;
  payload: ContextPayload;
}

export interface ContextPayload {
  tab_id: number;
  url: string;
  title: string;
  content: string;
  site_data: SiteData | null;
  meta: Record<string, unknown>;
  classification: string;
  is_active_tab: boolean;
}

export interface SiteData {
  siteName: string;
  entityType: string;
  data: Record<string, unknown>;
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

export interface UserActionMessage extends MessageEnvelope {
  type: 'user_action';
  payload: {
    tab_id: number;
    action: {
      type: string;
      timestamp: string;
      url: string;
      target: {
        selector: string;
        tagName: string;
        text: string | null;
        href: string | null;
      };
      value: string | null;
    };
  };
}

export interface ChatMessageInbound extends MessageEnvelope {
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

export type InboundMessage =
  | ContextUpdateMessage
  | ContextSnapshotMessage
  | UserActionMessage
  | TabPingMessage
  | HighlightMessage
  | ContextMenuActionMessage
  | ChatMessageInbound
  | PingMessage;

// --- Server → Client (plugin sends these) ---

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

export type OutboundMessage =
  | SuggestionMessage
  | ChatResponseMessage
  | SnapshotRequestMessage
  | BackpressureMessage
  | PongMessage;

// --- Plugin config ---

export interface PluginConfig {
  /** Port for the WebSocket server (default: 18790, separate from Gateway's 18789) */
  port: number;
  /** Accepted Bearer tokens (from OpenClaw Gateway config) */
  tokens: string[];
  /** OpenClaw Gateway URL for API calls */
  gatewayUrl: string;
  /** OpenClaw Gateway token for internal API calls */
  gatewayToken: string;
  /** Max context entries to keep per session */
  maxContextHistory: number;
  /** Enable suggestion engine */
  suggestionsEnabled: boolean;
}

// --- Browser context state ---

export interface TabState {
  tabId: number;
  url: string;
  title: string;
  content: string;
  siteData: SiteData | null;
  isActive: boolean;
  lastUpdated: number;
}

export interface SessionState {
  sessionId: string;
  extensionVersion: string;
  tabs: Map<number, TabState>;
  activeTabId: number | null;
  lastSequence: number;
  connectedAt: number;
  lastMessageAt: number;
}
