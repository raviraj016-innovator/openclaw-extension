import type {
  PageSnapshot,
  ExtensionState,
  OpenClawSuggestion,
  UserAction,
  ChatMessage,
  AuthMethod,
} from './types.js';

/**
 * Content Script → Service Worker messages.
 * Discriminated union on `type` field.
 */
export type ContentMessage =
  | {
      type: 'PAGE_SNAPSHOT';
      tabId: number;
      snapshot: PageSnapshot;
    }
  | {
      type: 'SELECTION_HIGHLIGHT';
      tabId: number;
      text: string;
      surroundingContext: string;
      url: string;
      title: string;
    }
  | {
      type: 'USER_ACTION';
      tabId: number;
      action: UserAction;
    }
  | {
      type: 'CONTENT_SCRIPT_READY';
      tabId: number;
      url: string;
    };

/**
 * Service Worker → UI (popup + side panel) messages.
 * Discriminated union on `type` field.
 */
export type UIMessage =
  | {
      type: 'STATE_UPDATE';
      state: ExtensionState;
    }
  | {
      type: 'SUGGESTION';
      suggestion: OpenClawSuggestion;
    }
  | {
      type: 'CLASSIFICATION_PROMPT';
      domain: string;
      tabId: number;
      url: string;
    }
  | {
      type: 'CHAT_RESPONSE';
      message: ChatMessage;
    }
  | {
      type: 'NOTIFICATION';
      title: string;
      body: string;
      level: 'info' | 'warning' | 'error';
    };

/**
 * UI → Service Worker requests.
 * Discriminated union on `type` field.
 */
export type UIRequest =
  | {
      type: 'GET_STATE';
    }
  | {
      type: 'PAUSE_STREAMING';
    }
  | {
      type: 'RESUME_STREAMING';
    }
  | {
      type: 'OVERRIDE_CLASSIFICATION';
      domain: string;
      classification: 'allowed' | 'blocked';
    }
  | {
      type: 'TEACH_DOMAIN';
      domain: string;
      isWorkTool: boolean;
    }
  | {
      type: 'START_AUTH';
      method: AuthMethod;
      instanceUrl?: string;
      apiKey?: string;
    }
  | {
      type: 'DISCONNECT';
    }
  | {
      type: 'SEND_CHAT';
      text: string;
      conversationId: string | null;
    }
  | {
      type: 'TOGGLE_DEBUG_OVERLAY';
      tabId: number;
      enabled: boolean;
    }
  | {
      type: 'REQUEST_SNAPSHOT';
      tabId: number;
    };

/** All message types the service worker can receive */
export type IncomingMessage = ContentMessage | UIRequest;
