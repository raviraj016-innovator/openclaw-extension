import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthManager } from '../../src/background/auth.js';
import { createMockPlatform } from '../fixtures/mock-platform.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('AuthManager', () => {
  let platform: ReturnType<typeof createMockPlatform>;
  let authChanges: unknown[];
  let authManager: AuthManager;

  beforeEach(() => {
    vi.clearAllMocks();
    platform = createMockPlatform();
    authChanges = [];
    authManager = new AuthManager(platform, {
      onAuthChange: (auth) => authChanges.push(auth),
    });
  });

  describe('loadStored', () => {
    it('returns null when no stored auth', async () => {
      (platform.persistentStorage.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await authManager.loadStored();
      expect(result).toBeNull();
    });

    it('returns stored API key auth', async () => {
      const stored = {
        method: 'api_key',
        token: 'test-key',
        instanceUrl: 'https://example.com',
        expiresAt: null,
        refreshToken: null,
      };
      (platform.persistentStorage.get as ReturnType<typeof vi.fn>).mockResolvedValue(stored);
      const result = await authManager.loadStored();
      expect(result).toEqual(stored);
    });

    it('clears expired OAuth token without refresh token', async () => {
      const stored = {
        method: 'oauth',
        token: 'expired',
        instanceUrl: 'https://example.com',
        expiresAt: Date.now() - 1000, // expired
        refreshToken: null,
      };
      (platform.persistentStorage.get as ReturnType<typeof vi.fn>).mockResolvedValue(stored);
      const result = await authManager.loadStored();
      expect(result).toBeNull();
      expect(platform.persistentStorage.remove).toHaveBeenCalledWith('auth');
    });
  });

  describe('startApiKey', () => {
    it('rejects empty API key', async () => {
      const result = await authManager.startApiKey('https://example.com', '');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('empty');
      }
    });

    it('rejects empty instance URL', async () => {
      const result = await authManager.startApiKey('', 'test-key');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('empty');
      }
    });

    it('rejects invalid URL format', async () => {
      const result = await authManager.startApiKey('not-a-url', 'test-key');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid');
      }
    });

    it('rejects invalid API key (401)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 });
      const result = await authManager.startApiKey('https://example.com', 'bad-key');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('invalid or revoked');
      }
    });

    it('rejects revoked API key (403)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 403 });
      const result = await authManager.startApiKey('https://example.com', 'revoked-key');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('invalid or revoked');
      }
    });

    it('handles unreachable instance', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));
      const result = await authManager.startApiKey('https://unreachable.example.com', 'key');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Cannot reach');
      }
    });

    it('succeeds with valid API key', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      const result = await authManager.startApiKey('https://example.com', 'valid-key');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.method).toBe('api_key');
        expect(result.value.token).toBe('valid-key');
        expect(result.value.instanceUrl).toBe('https://example.com');
      }
    });

    it('stores auth on success', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      await authManager.startApiKey('https://example.com', 'valid-key');
      expect(platform.persistentStorage.set).toHaveBeenCalledWith('auth', expect.objectContaining({
        method: 'api_key',
        token: 'valid-key',
      }));
    });

    it('notifies listener on success', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      await authManager.startApiKey('https://example.com', 'valid-key');
      expect(authChanges).toHaveLength(1);
      expect(authChanges[0]).toMatchObject({ method: 'api_key' });
    });

    it('handles server error (500)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      const result = await authManager.startApiKey('https://example.com', 'key');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('500');
      }
    });
  });

  describe('clearAuth', () => {
    it('removes stored auth and notifies listener', async () => {
      await authManager.clearAuth();
      expect(platform.persistentStorage.remove).toHaveBeenCalledWith('auth');
      expect(authChanges).toHaveLength(1);
      expect(authChanges[0]).toBeNull();
    });
  });
});
