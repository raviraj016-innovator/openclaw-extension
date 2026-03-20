/**
 * Smart page classifier.
 *
 * Determines whether a page should be streamed to OpenClaw.
 * Runs ONLY in the service worker (single source of truth).
 *
 *   Classification pipeline:
 *   ┌─────────────────────────────┐
 *   │ 1. PRIVILEGED URL CHECK     │  chrome://, about:, data:, file://
 *   │    → SKIP (not classifiable)│
 *   └────────────┬────────────────┘
 *                │
 *   ┌────────────▼────────────────┐
 *   │ 2. USER OVERRIDES           │  Highest priority. User said allow/block.
 *   │    (stored in storage)      │
 *   └────────────┬────────────────┘
 *                │ no override
 *   ┌────────────▼────────────────┐
 *   │ 3. KNOWN DOMAIN LISTS       │  Static allow/block lists
 *   │    ALLOW: github.com...     │
 *   │    BLOCK: chase.com...      │
 *   └────────────┬────────────────┘
 *                │ not in list
 *   ┌────────────▼────────────────┐
 *   │ 4. CONTENT HEURISTICS       │  Password fields, financial keywords,
 *   │                             │  medical terms, login forms
 *   └────────────┬────────────────┘
 *                │ no signal
 *   ┌────────────▼────────────────┐
 *   │ 5. DEFAULT: ALLOW           │  Unknown = stream it.
 *   │    (sensitive sites already  │  Known blocks + heuristics
 *   │     caught above)            │  cover dangerous pages.
 *   └─────────────────────────────┘
 */

import type { ClassificationResult } from '../shared/types.js';
import type { Platform } from '../platform/platform.js';

// --- Known domain lists ---

const KNOWN_ALLOW_DOMAINS = new Set([
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'atlassian.net',
  'linear.app',
  'notion.so',
  'slack.com',
  'app.slack.com',
  'discord.com',
  'stackoverflow.com',
  'docs.google.com',
  'sheets.google.com',
  'drive.google.com',
  'console.cloud.google.com',
  'console.aws.amazon.com',
  'portal.azure.com',
  'app.datadog.com',
  'app.sentry.io',
  'vercel.com',
  'netlify.com',
  'render.com',
  'railway.app',
  'fly.io',
  'heroku.com',
  // confluence.atlassian.net covered by atlassian.net above
  'figma.com',
  'trello.com',
  'asana.com',
  'monday.com',
  'clickup.com',
]);

const KNOWN_BLOCK_DOMAINS = new Set([
  // Banking
  'chase.com',
  'wellsfargo.com',
  'bankofamerica.com',
  'citi.com',
  'capitalone.com',
  'usbank.com',
  'ally.com',
  'schwab.com',
  'fidelity.com',
  'vanguard.com',
  'tdameritrade.com',
  'robinhood.com',
  'coinbase.com',
  'paypal.com',
  'venmo.com',
  // Medical
  'mychart.com',
  'patient.portal',
  'healthgrades.com',
  // Password managers
  '1password.com',
  'bitwarden.com',
  'lastpass.com',
  'dashlane.com',
  'keepersecurity.com',
  // OAuth / Sign-in
  'accounts.google.com',
  'login.microsoftonline.com',
  'auth0.com',
  'clerk.dev',
  'clerk.com',
  'login.okta.com',
  'sso.google.com',
  // Email (personal)
  'mail.google.com',
  'outlook.live.com',
  'mail.yahoo.com',
  // Social (personal)
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'reddit.com',
]);

const BLOCK_DOMAIN_PATTERNS = [
  /bank/i,
  /credit/i,
  /loan/i,
  /mortgage/i,
  /insurance/i,
  /health/i,
  /medical/i,
  /patient/i,
  /pharmacy/i,
  /tax/i,
];

const SENSITIVE_CONTENT_SIGNALS = [
  'input[type="password"]',
  'input[type="credit-card"]',
  'input[autocomplete="cc-number"]',
  'input[autocomplete="cc-exp"]',
  'input[autocomplete="cc-csc"]',
];

const PRIVILEGED_PROTOCOLS = new Set(['chrome:', 'chrome-extension:', 'moz-extension:', 'about:', 'data:', 'file:', 'blob:']);

export class Classifier {
  private platform: Platform;
  private userOverrides = new Map<string, 'allowed' | 'blocked'>();

  constructor(platform: Platform) {
    this.platform = platform;
  }

  /** Load user overrides from storage */
  async loadOverrides(): Promise<void> {
    const stored = await this.platform.persistentStorage.get<Record<string, 'allowed' | 'blocked'>>('classifierOverrides');
    if (stored) {
      this.userOverrides = new Map(Object.entries(stored));
    }
  }

  /** Save user override for a domain */
  async setOverride(domain: string, classification: 'allowed' | 'blocked'): Promise<void> {
    this.userOverrides.set(domain, classification);
    await this.platform.persistentStorage.set(
      'classifierOverrides',
      Object.fromEntries(this.userOverrides),
    );
  }

  /** Teach OpenClaw about a domain */
  async teachDomain(domain: string, isWorkTool: boolean): Promise<void> {
    await this.setOverride(domain, isWorkTool ? 'allowed' : 'blocked');
  }

  /**
   * Classify a URL. This is the single source of truth for classification.
   *
   * @param url - The page URL
   * @param hasPasswordField - Whether the page contains a password input
   * @param hasCreditCardField - Whether the page contains credit card inputs
   */
  classify(
    url: string,
    hasPasswordField: boolean = false,
    hasCreditCardField: boolean = false,
  ): ClassificationResult {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        classification: 'blocked',
        source: 'default_block',
        domain: url,
        reason: 'Invalid URL',
      };
    }

    // 1. Privileged URL check
    if (PRIVILEGED_PROTOCOLS.has(parsedUrl.protocol)) {
      return {
        classification: 'blocked',
        source: 'default_block',
        domain: parsedUrl.hostname,
        reason: `Privileged protocol: ${parsedUrl.protocol}`,
      };
    }

    const domain = parsedUrl.hostname;
    const baseDomain = this.getBaseDomain(domain);

    // 2. User overrides (highest priority)
    const override = this.userOverrides.get(domain) ?? this.userOverrides.get(baseDomain);
    if (override) {
      return {
        classification: override,
        source: 'user_override',
        domain,
        reason: `User set ${domain} to ${override}`,
      };
    }

    // 3. Known domain lists
    if (this.matchesDomainSet(domain, KNOWN_ALLOW_DOMAINS)) {
      return {
        classification: 'allowed',
        source: 'known_allow_list',
        domain,
        reason: `Known work tool: ${domain}`,
      };
    }

    if (this.matchesDomainSet(domain, KNOWN_BLOCK_DOMAINS)) {
      return {
        classification: 'blocked',
        source: 'known_block_list',
        domain,
        reason: `Known sensitive site: ${domain}`,
      };
    }

    // 4. Content heuristics
    if (hasCreditCardField) {
      return {
        classification: 'blocked',
        source: 'heuristic_block',
        domain,
        reason: 'Credit card input detected',
      };
    }

    if (hasPasswordField) {
      // Password fields on unknown sites are suspicious
      return {
        classification: 'blocked',
        source: 'heuristic_block',
        domain,
        reason: 'Password field detected on unknown site',
      };
    }

    // Domain pattern matching (banking, medical keywords in URL)
    for (const pattern of BLOCK_DOMAIN_PATTERNS) {
      if (pattern.test(domain) || pattern.test(parsedUrl.pathname)) {
        return {
          classification: 'blocked',
          source: 'heuristic_block',
          domain,
          reason: `URL matches sensitive pattern: ${pattern.source}`,
        };
      }
    }

    // Auth/OAuth URL path detection — block sign-in pages on ANY domain
    const authPathPatterns = [
      /\/sign[-_]?in/i,
      /\/log[-_]?in/i,
      /\/oauth/i,
      /\/sso/i,
      /\/auth\//i,
      /\/callback.*code=/i,
      /GeneralOAuthFlow/i,
    ];
    const fullUrl = parsedUrl.pathname + parsedUrl.search;
    for (const pattern of authPathPatterns) {
      if (pattern.test(fullUrl)) {
        return {
          classification: 'blocked',
          source: 'heuristic_block',
          domain,
          reason: `Auth/login page detected: ${pattern.source}`,
        };
      }
    }

    // 5. Default: ALLOW unknown domains
    // Known-sensitive sites are already caught by the block list and heuristics above.
    // Blocking everything by default creates terrible UX (user must teach every domain).
    return {
      classification: 'allowed',
      source: 'default_allow',
      domain,
      reason: 'Unknown domain — allowed by default (sensitive sites are blocked above)',
    };
  }

  /** Get list of sensitive CSS selectors to check in the content script */
  getSensitiveSelectors(): string[] {
    return [...SENSITIVE_CONTENT_SIGNALS];
  }

  private matchesDomainSet(domain: string, set: Set<string>): boolean {
    // Exact match
    if (set.has(domain)) return true;
    // Check if it's a subdomain of a known domain
    for (const known of set) {
      if (domain.endsWith(`.${known}`)) return true;
    }
    return false;
  }

  private getBaseDomain(domain: string): string {
    const parts = domain.split('.');
    if (parts.length <= 2) return domain;
    return parts.slice(-2).join('.');
  }
}
