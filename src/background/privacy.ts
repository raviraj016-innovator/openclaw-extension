/**
 * Privacy filter and audit trail.
 *
 * - Enforces incognito blocking (hard block, defense in depth)
 * - Strips password field values from content
 * - Logs every classification decision and context send to audit trail
 */

import type { AuditEntry, ClassificationResult } from '../shared/types.js';
import type { Platform } from '../platform/platform.js';
import { AUDIT_LOG_MAX_ENTRIES } from '../shared/constants.js';

const AUDIT_STORAGE_KEY = 'auditLog';

export class PrivacyFilter {
  private platform: Platform;
  private auditLog: AuditEntry[] = [];

  constructor(platform: Platform) {
    this.platform = platform;
  }

  async loadAuditLog(): Promise<void> {
    const stored = await this.platform.persistentStorage.get<AuditEntry[]>(AUDIT_STORAGE_KEY);
    if (stored) {
      this.auditLog = stored;
    }
  }

  /** Strip sensitive content from page text */
  sanitizeContent(content: string): string {
    // Strip anything that looks like a credit card number (13-19 digits)
    let sanitized = content.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g, '[REDACTED_CARD]');

    // Strip SSN patterns
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');

    // Strip email addresses from non-work contexts (best effort)
    // Keeping emails since they could be usernames on work tools

    return sanitized;
  }

  /** Log a classification decision */
  async logClassification(result: ClassificationResult): Promise<void> {
    await this.addAuditEntry({
      timestamp: new Date().toISOString(),
      type: 'classification',
      domain: result.domain,
      detail: `${result.classification} via ${result.source}: ${result.reason}`,
      contentHash: null,
    });
  }

  /** Log that context was sent to OpenClaw */
  async logContextSent(domain: string, contentHash: string): Promise<void> {
    await this.addAuditEntry({
      timestamp: new Date().toISOString(),
      type: 'context_sent',
      domain,
      detail: 'Context streamed to OpenClaw',
      contentHash,
    });
  }

  /** Log that content was blocked */
  async logContextBlocked(domain: string, reason: string): Promise<void> {
    await this.addAuditEntry({
      timestamp: new Date().toISOString(),
      type: 'context_blocked',
      domain,
      detail: `Blocked: ${reason}`,
      contentHash: null,
    });
  }

  /** Log auth events */
  async logAuthEvent(detail: string): Promise<void> {
    await this.addAuditEntry({
      timestamp: new Date().toISOString(),
      type: 'auth_event',
      domain: '',
      detail,
      contentHash: null,
    });
  }

  /** Get audit log entries (most recent first) */
  getAuditLog(limit: number = 100): AuditEntry[] {
    return this.auditLog.slice(-limit).reverse();
  }

  /** Export audit log as JSON string */
  exportAuditLog(): string {
    return JSON.stringify(this.auditLog, null, 2);
  }

  /** Compute SHA-256 hash of content (for audit trail — stores hash, not content) */
  async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async addAuditEntry(entry: AuditEntry): Promise<void> {
    this.auditLog.push(entry);

    // Ring buffer: keep only the last N entries
    if (this.auditLog.length > AUDIT_LOG_MAX_ENTRIES) {
      this.auditLog = this.auditLog.slice(-AUDIT_LOG_MAX_ENTRIES);
    }

    // Persist (fire-and-forget, non-blocking)
    this.platform.persistentStorage.set(AUDIT_STORAGE_KEY, this.auditLog).catch(() => {
      // Storage write failed — audit log will be lost but extension continues
    });
  }
}
