import { describe, it, expect } from 'vitest';
import { diffContent } from '../../src/background/diff-engine.js';

describe('diffContent', () => {
  it('reports changed for first snapshot (null previous)', () => {
    const result = diffContent(null, 'Hello world');
    expect(result.hasChanged).toBe(true);
    expect(result.changeRatio).toBe(1.0);
  });

  it('reports no change for identical content', () => {
    const content = 'The quick brown fox jumps over the lazy dog.';
    const result = diffContent(content, content);
    expect(result.hasChanged).toBe(false);
    expect(result.changeRatio).toBe(0.0);
  });

  it('detects significant content change', () => {
    const before = 'Page about cats and dogs and other pets.';
    const after = 'Page about rockets and space exploration and NASA.';
    const result = diffContent(before, after);
    expect(result.hasChanged).toBe(true);
    expect(result.changeRatio).toBeGreaterThan(0.02);
  });

  it('ignores tiny changes (noise threshold)', () => {
    const before = 'A'.repeat(1000) + 'x';
    const after = 'A'.repeat(1000) + 'y';
    const result = diffContent(before, after);
    // Less than 2% change — should be treated as noise
    expect(result.changeRatio).toBeLessThan(0.05);
  });

  it('handles empty current content', () => {
    const result = diffContent('Some content', '');
    expect(result.hasChanged).toBe(true);
    expect(result.changeRatio).toBe(1.0);
  });

  it('handles both empty', () => {
    const result = diffContent('', '');
    expect(result.hasChanged).toBe(false);
  });

  it('detects large content addition', () => {
    const before = 'Short page.';
    const after = 'Short page.' + ' Long additional content.'.repeat(100);
    const result = diffContent(before, after);
    expect(result.hasChanged).toBe(true);
    expect(result.changeRatio).toBeGreaterThan(0.3);
  });

  it('returns new content in result', () => {
    const result = diffContent('old', 'new');
    expect(result.newContent).toBe('new');
  });
});
