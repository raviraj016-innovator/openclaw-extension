import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrivacyFilter } from '../../src/background/privacy.js';
import { createMockPlatform } from '../fixtures/mock-platform.js';

const mockPlatform = createMockPlatform();

describe('PrivacyFilter', () => {
  let filter: PrivacyFilter;

  beforeEach(() => {
    vi.clearAllMocks();
    filter = new PrivacyFilter(mockPlatform);
  });

  describe('sanitizeContent', () => {
    it('redacts credit card numbers', () => {
      const content = 'My card is 4111-1111-1111-1111 please charge it';
      const sanitized = filter.sanitizeContent(content);
      expect(sanitized).toContain('[REDACTED_CARD]');
      expect(sanitized).not.toContain('4111');
    });

    it('redacts SSN patterns', () => {
      const content = 'SSN: 123-45-6789';
      const sanitized = filter.sanitizeContent(content);
      expect(sanitized).toContain('[REDACTED_SSN]');
      expect(sanitized).not.toContain('123-45-6789');
    });

    it('preserves normal content', () => {
      const content = 'This is a normal page about programming with TypeScript.';
      const sanitized = filter.sanitizeContent(content);
      expect(sanitized).toBe(content);
    });

    it('handles empty content', () => {
      expect(filter.sanitizeContent('')).toBe('');
    });
  });

  describe('audit log', () => {
    it('logs classification decisions', async () => {
      await filter.logClassification({
        classification: 'allowed',
        source: 'known_allow_list',
        domain: 'github.com',
        reason: 'Known work tool',
      });
      const log = filter.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.type).toBe('classification');
      expect(log[0]!.domain).toBe('github.com');
    });

    it('logs context sent events', async () => {
      await filter.logContextSent('github.com', 'abc123hash');
      const log = filter.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.type).toBe('context_sent');
      expect(log[0]!.contentHash).toBe('abc123hash');
    });

    it('returns most recent entries first', async () => {
      await filter.logContextSent('a.com', 'hash1');
      await filter.logContextSent('b.com', 'hash2');
      const log = filter.getAuditLog();
      expect(log[0]!.domain).toBe('b.com');
      expect(log[1]!.domain).toBe('a.com');
    });

    it('exports log as JSON', async () => {
      await filter.logContextSent('github.com', 'hash');
      const exported = filter.exportAuditLog();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });
  });
});
