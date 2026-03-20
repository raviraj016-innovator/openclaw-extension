/**
 * Backpressure manager — controls context streaming rate based on
 * server signals and client-side limits.
 */

import { DEFAULT_MAX_RATE_PER_MINUTE } from '../shared/constants.js';

export class BackpressureManager {
  private maxRatePerMinute: number = DEFAULT_MAX_RATE_PER_MINUTE;
  private sendTimestamps: number[] = [];
  private serverOverride: number | null = null;

  /** Get current effective rate limit (messages per minute) */
  getEffectiveRate(): number {
    return this.serverOverride ?? this.maxRatePerMinute;
  }

  /** Check if we can send a message right now */
  canSend(): boolean {
    this.pruneOldTimestamps();
    return this.sendTimestamps.length < this.getEffectiveRate();
  }

  /** Record that a message was sent */
  recordSend(): void {
    this.sendTimestamps.push(Date.now());
  }

  /** Handle backpressure signal from server */
  applyServerBackpressure(maxRatePerMinute: number): void {
    this.serverOverride = maxRatePerMinute;
  }

  /** Server says resume normal rate */
  clearServerBackpressure(): void {
    this.serverOverride = null;
  }

  /** Get milliseconds until next send is allowed (0 = can send now) */
  getMsUntilNextSend(): number {
    if (this.canSend()) return 0;
    const oldest = this.sendTimestamps[0];
    if (oldest === undefined) return 0;
    return Math.max(0, oldest + 60_000 - Date.now());
  }

  private pruneOldTimestamps(): void {
    const oneMinuteAgo = Date.now() - 60_000;
    while (this.sendTimestamps.length > 0 && this.sendTimestamps[0]! < oneMinuteAgo) {
      this.sendTimestamps.shift();
    }
  }
}
