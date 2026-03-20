/**
 * Shared UTC timestamp utility for consistent log formatting.
 * Format: HH:MM:SS.mmm UTC
 */
export function utcTimestamp(): string {
  const now = new Date();
  const h = String(now.getUTCHours()).padStart(2, '0');
  const m = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms} UTC`;
}
