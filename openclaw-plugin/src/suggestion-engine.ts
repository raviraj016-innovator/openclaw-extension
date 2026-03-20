/**
 * Suggestion Engine — watches browser context and generates proactive suggestions.
 *
 * Monitors context updates and triggers suggestions when it detects
 * patterns the user might want help with:
 *
 * - User views a GitHub issue → suggest related PRs
 * - User views an error page → suggest debugging help
 * - User switches between related tabs → suggest correlation
 *
 * This is the "ambient intelligence" layer — OpenClaw proactively helps
 * based on what the user is looking at.
 */

import type { ContextPayload, SuggestionMessage, SiteData } from './types.js';
import type { ContextStore } from './context-store.js';
import type { GatewayClient } from './gateway-client.js';

export type SuggestionCallback = (suggestion: SuggestionMessage) => void;

interface SuggestionRule {
  name: string;
  /** Check if this rule should fire for the given context */
  matches(payload: ContextPayload, history: { url: string }[]): boolean;
  /** Generate the suggestion */
  generate(payload: ContextPayload): SuggestionMessage['payload'];
  /** Cooldown in ms — don't fire the same rule more than once per interval */
  cooldownMs: number;
}

export class SuggestionEngine {
  private callback: SuggestionCallback;
  private contextStore: ContextStore;
  private gateway: GatewayClient;
  private lastFired = new Map<string, number>();
  private rules: SuggestionRule[];

  constructor(
    contextStore: ContextStore,
    gateway: GatewayClient,
    callback: SuggestionCallback,
  ) {
    this.contextStore = contextStore;
    this.gateway = gateway;
    this.callback = callback;
    this.rules = this.buildRules();
  }

  /** Evaluate context update against all rules */
  evaluate(sessionId: string, payload: ContextPayload): void {
    const history = this.contextStore.getHistory(sessionId, 10);

    for (const rule of this.rules) {
      // Check cooldown
      const lastFired = this.lastFired.get(rule.name) ?? 0;
      if (Date.now() - lastFired < rule.cooldownMs) continue;

      if (rule.matches(payload, history)) {
        const suggestion = rule.generate(payload);
        this.lastFired.set(rule.name, Date.now());

        this.callback({
          protocol_version: '1.0',
          type: 'suggestion',
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          payload: suggestion,
        });
      }
    }
  }

  private buildRules(): SuggestionRule[] {
    return [
      // Rule: User is viewing a GitHub PR — offer to review it
      {
        name: 'github-pr-review',
        cooldownMs: 300_000, // 5 min cooldown
        matches(payload) {
          return payload.site_data?.entityType === 'pull_request' &&
                 payload.is_active_tab;
        },
        generate(payload) {
          const pr = payload.site_data!.data;
          return {
            title: `Review PR #${pr['number']}?`,
            body: `I can see you're looking at "${pr['title']}". Want me to review the changes?`,
            actions: [
              { label: 'Review this PR', action: 'review_pr' },
              { label: 'Dismiss', action: 'dismiss' },
            ],
            priority: 'normal' as const,
            related_tab_id: payload.tab_id,
          };
        },
      },

      // Rule: User is viewing a GitHub issue — offer to help
      {
        name: 'github-issue-help',
        cooldownMs: 300_000,
        matches(payload) {
          return payload.site_data?.entityType === 'issue' &&
                 payload.is_active_tab;
        },
        generate(payload) {
          const issue = payload.site_data!.data;
          return {
            title: `Help with issue #${issue['number']}?`,
            body: `I see "${issue['title']}". I can search for related discussions or propose a solution.`,
            actions: [
              { label: 'Find related', action: 'search_related' },
              { label: 'Dismiss', action: 'dismiss' },
            ],
            priority: 'low' as const,
            related_tab_id: payload.tab_id,
          };
        },
      },

      // Rule: User visits an error/status page (500, 404, etc.)
      {
        name: 'error-page-help',
        cooldownMs: 60_000, // 1 min — errors are urgent
        matches(payload) {
          const errorSignals = [
            /\b(500|502|503|504)\b/,
            /internal server error/i,
            /page not found/i,
            /something went wrong/i,
            /error occurred/i,
          ];
          return errorSignals.some((r) => r.test(payload.title) || r.test(payload.content.slice(0, 500)));
        },
        generate(payload) {
          return {
            title: 'Error detected',
            body: `Looks like there's an error on ${new URL(payload.url).hostname}. Want me to help debug it?`,
            actions: [
              { label: 'Help debug', action: 'debug_error' },
              { label: 'Dismiss', action: 'dismiss' },
            ],
            priority: 'high' as const,
            related_tab_id: payload.tab_id,
          };
        },
      },

      // Rule: User views a Jira ticket — offer context
      {
        name: 'jira-ticket-context',
        cooldownMs: 300_000,
        matches(payload) {
          return payload.site_data?.siteName === 'Jira' &&
                 payload.is_active_tab;
        },
        generate(payload) {
          const issue = payload.site_data!.data;
          return {
            title: `Context for ${issue['issueKey']}`,
            body: `I can find related code, PRs, or previous discussions about "${issue['summary']}".`,
            actions: [
              { label: 'Find related code', action: 'search_code' },
              { label: 'Dismiss', action: 'dismiss' },
            ],
            priority: 'low' as const,
            related_tab_id: payload.tab_id,
          };
        },
      },
    ];
  }
}
