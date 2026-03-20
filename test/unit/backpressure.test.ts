import { describe, it, expect, beforeEach } from 'vitest';
import { BackpressureManager } from '../../src/background/backpressure.js';

describe('BackpressureManager', () => {
  let bp: BackpressureManager;

  beforeEach(() => {
    bp = new BackpressureManager();
  });

  it('allows sending when under rate limit', () => {
    expect(bp.canSend()).toBe(true);
  });

  it('tracks send timestamps', () => {
    bp.recordSend();
    expect(bp.canSend()).toBe(true); // Still under limit
  });

  it('applies server backpressure', () => {
    bp.applyServerBackpressure(1); // Max 1 per minute

    bp.recordSend();
    expect(bp.canSend()).toBe(false);
  });

  it('clears server backpressure', () => {
    bp.applyServerBackpressure(1);
    bp.recordSend();
    expect(bp.canSend()).toBe(false);

    bp.clearServerBackpressure();
    expect(bp.canSend()).toBe(true);
  });

  it('returns effective rate', () => {
    expect(bp.getEffectiveRate()).toBe(12); // default

    bp.applyServerBackpressure(5);
    expect(bp.getEffectiveRate()).toBe(5);

    bp.clearServerBackpressure();
    expect(bp.getEffectiveRate()).toBe(12);
  });

  it('getMsUntilNextSend returns 0 when can send', () => {
    expect(bp.getMsUntilNextSend()).toBe(0);
  });
});
