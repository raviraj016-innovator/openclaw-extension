/**
 * Gateway Client — communicates with OpenClaw's HTTP Gateway API.
 *
 * Injects browser context into conversations, stores context in memory,
 * and forwards chat messages between the extension and OpenClaw.
 *
 *   Extension ──ws──▶ Plugin ──http──▶ OpenClaw Gateway (port 18789)
 *                       │                      │
 *                       │  /conversations      │  LLM processes message
 *                       │  /memory             │  with browser context
 *                       └──────────────────────┘
 */

import type { PluginConfig } from './types.js';

export class GatewayClient {
  private config: PluginConfig;

  constructor(config: PluginConfig) {
    this.config = config;
  }

  /**
   * Send a conversation message to OpenClaw with browser context injected.
   * This is how the extension's chat messages reach OpenClaw.
   */
  async sendConversationMessage(
    conversationId: string,
    userMessage: string,
    browserContext: string,
  ): Promise<{ ok: boolean; response?: string; error?: string }> {
    try {
      // Inject browser context as a system message before the user message
      const messages = [
        {
          role: 'system',
          content: browserContext,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ];

      const response = await fetch(`${this.config.gatewayUrl}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.gatewayToken}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          messages,
        }),
      });

      if (!response.ok) {
        return { ok: false, error: `Gateway returned ${response.status}` };
      }

      const data = (await response.json()) as { response?: string };
      return { ok: true, response: data.response };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Store browser context in OpenClaw's memory system.
   * This gives OpenClaw persistent awareness of what the user has been browsing.
   */
  async storeContextMemory(
    key: string,
    contextSummary: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.config.gatewayUrl}/api/memory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.gatewayToken}`,
        },
        body: JSON.stringify({
          key: `browser_context:${key}`,
          value: contextSummary,
          ttl: 3600, // 1 hour — context is ephemeral
        }),
      });

      if (!response.ok) {
        return { ok: false, error: `Gateway returned ${response.status}` };
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Send a highlight or context-menu action as a direct message to OpenClaw.
   * These are high-priority, user-initiated actions.
   */
  async sendDirectMessage(
    text: string,
    browserContext: string,
  ): Promise<{ ok: boolean; response?: string; error?: string }> {
    return this.sendConversationMessage(
      crypto.randomUUID(), // New conversation for direct actions
      text,
      browserContext,
    );
  }

  /** Health check — verify Gateway is reachable */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.gatewayUrl}/health`, {
        headers: { Authorization: `Bearer ${this.config.gatewayToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
