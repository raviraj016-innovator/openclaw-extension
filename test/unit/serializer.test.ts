import { describe, it, expect } from 'vitest';
import { safeStringify } from '../../src/lib/serializer.js';

describe('safeStringify', () => {
  it('serializes normal objects', () => {
    const result = safeStringify({ hello: 'world', count: 42 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.value)).toEqual({ hello: 'world', count: 42 });
    }
  });

  it('handles circular references', () => {
    const obj: Record<string, unknown> = { name: 'test' };
    obj['self'] = obj;
    const result = safeStringify(obj);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = JSON.parse(result.value);
      expect(parsed.name).toBe('test');
      expect(parsed.self).toBe('[Circular]');
    }
  });

  it('handles BigInt values', () => {
    const result = safeStringify({ big: BigInt(9007199254740991) });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = JSON.parse(result.value);
      expect(parsed.big).toBe('9007199254740991');
    }
  });

  it('handles null', () => {
    const result = safeStringify(null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('null');
    }
  });

  it('handles arrays', () => {
    const result = safeStringify([1, 'two', null, { three: 3 }]);
    expect(result.ok).toBe(true);
  });

  it('handles nested objects with mixed types', () => {
    const result = safeStringify({
      string: 'hello',
      number: 42,
      boolean: true,
      null_val: null,
      array: [1, 2, 3],
      nested: { deep: { value: 'found' } },
    });
    expect(result.ok).toBe(true);
  });

  it('handles undefined value (standard JSON behavior — omits key)', () => {
    const result = safeStringify({ a: 1, b: undefined, c: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = JSON.parse(result.value);
      expect(parsed).toEqual({ a: 1, c: 3 });
    }
  });
});
