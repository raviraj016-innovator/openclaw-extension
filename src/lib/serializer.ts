/**
 * Safe JSON serializer — handles circular references, BigInt, undefined, Symbol.
 *
 * Used for serializing page content and messages before sending over WebSocket.
 * Never throws — returns a Result.
 */

import { ok, err, type Result } from '../shared/result.js';

/**
 * Safely serialize a value to JSON, handling:
 * - Circular references (replaced with "[Circular]")
 * - BigInt (converted to string)
 * - undefined (omitted, standard JSON behavior)
 * - Symbol (omitted, standard JSON behavior)
 * - Functions (omitted)
 */
export function safeStringify(value: unknown): Result<string, Error> {
  const seen = new WeakSet();

  try {
    const result = JSON.stringify(value, (_key, val) => {
      // Handle BigInt
      if (typeof val === 'bigint') {
        return val.toString();
      }

      // Handle circular references
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }

      return val;
    });

    if (result === undefined) {
      return err(new Error('JSON.stringify returned undefined'));
    }

    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
