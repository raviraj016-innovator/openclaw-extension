import { describe, it, expect } from 'vitest';
import { ok, err, tryCatch } from '../../src/shared/result.js';

describe('Result type', () => {
  it('ok wraps a value', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it('err wraps an error', () => {
    const result = err(new Error('test'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('test');
    }
  });

  it('tryCatch wraps successful async function', async () => {
    const result = await tryCatch(async () => 42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it('tryCatch wraps throwing async function', async () => {
    const result = await tryCatch(async () => {
      throw new Error('boom');
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('boom');
    }
  });

  it('tryCatch handles non-Error throws', async () => {
    const result = await tryCatch(async () => {
      throw 'string error';
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('string error');
    }
  });
});
