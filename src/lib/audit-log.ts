/**
 * Audit log utilities — formatting and export helpers.
 */

import type { AuditEntry } from '../shared/types.js';

/** Format an audit entry for display */
export function formatAuditEntry(entry: AuditEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const icon = entry.type === 'context_sent' ? '📤'
    : entry.type === 'context_blocked' ? '🔒'
    : entry.type === 'classification' ? '🏷️'
    : '🔑';

  return `${time} ${icon} [${entry.domain}] ${entry.detail}`;
}

/** Format audit log as CSV for export */
export function auditLogToCsv(entries: AuditEntry[]): string {
  const header = 'timestamp,type,domain,detail,content_hash';
  const rows = entries.map((e) =>
    [
      e.timestamp,
      e.type,
      csvEscape(e.domain),
      csvEscape(e.detail),
      e.contentHash ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
