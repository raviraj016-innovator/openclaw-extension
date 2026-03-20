/**
 * Auth manager — handles OAuth (OpenClaw Cloud) and API key (self-hosted) flows.
 *
 * OAuth flow:
 *   1. Open OAuth consent URL in new tab
 *   2. Listen for redirect callback with auth code
 *   3. Exchange code for token
 *   4. Store token, schedule refresh
 *
 * API key flow:
 *   1. User pastes API key + instance URL
 *   2. Validate with a test request
 *   3. Store if valid
 */

import type { AuthState } from '../shared/types.js';
import type { Platform } from '../platform/platform.js';
import { ok, err, type Result } from '../shared/result.js';
import { AUTH_TIMEOUT_MS } from '../shared/constants.js';

export type AuthListener = {
  onAuthChange: (auth: AuthState | null) => void;
};

export class AuthManager {
  private platform: Platform;
  private listener: AuthListener;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(platform: Platform, listener: AuthListener) {
    this.platform = platform;
    this.listener = listener;
  }

  /** Load stored auth state on startup */
  async loadStored(): Promise<AuthState | null> {
    const stored = await this.platform.persistentStorage.get<AuthState>('auth');
    if (!stored) return null;

    // Check if OAuth token is expired
    if (stored.method === 'oauth' && stored.expiresAt && Date.now() > stored.expiresAt) {
      if (stored.refreshToken) {
        const refreshed = await this.refreshOAuthToken(stored);
        if (refreshed.ok) return refreshed.value;
      }
      // Expired and can't refresh — clear
      await this.clearAuth();
      return null;
    }

    this.scheduleRefresh(stored);
    return stored;
  }

  /** Start OAuth flow with OpenClaw Cloud */
  async startOAuth(instanceUrl: string): Promise<Result<AuthState, Error>> {
    const oauthUrl = `${instanceUrl}/oauth/authorize?client_id=openclaw-extension&response_type=code&redirect_uri=${encodeURIComponent(instanceUrl + '/oauth/callback')}`;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(err(new Error('OAuth flow timed out after 60 seconds')));
      }, AUTH_TIMEOUT_MS);

      // Open OAuth consent page
      if (typeof chrome !== 'undefined' && chrome.identity) {
        chrome.identity.launchWebAuthFlow(
          { url: oauthUrl, interactive: true },
          async (redirectUrl) => {
            clearTimeout(timeout);
            if (!redirectUrl) {
              resolve(err(new Error('OAuth flow cancelled by user')));
              return;
            }
            const result = await this.handleOAuthCallback(redirectUrl, instanceUrl);
            resolve(result);
          },
        );
      } else {
        // Firefox fallback: open tab and listen for redirect
        clearTimeout(timeout);
        resolve(err(new Error('OAuth not yet implemented for Firefox — use API key')));
      }
    });
  }

  /** Validate and store an API key */
  async startApiKey(instanceUrl: string, apiKey: string): Promise<Result<AuthState, Error>> {
    // Basic validation
    if (!apiKey || apiKey.trim().length === 0) {
      return err(new Error('API key cannot be empty'));
    }

    if (!instanceUrl || instanceUrl.trim().length === 0) {
      return err(new Error('Instance URL cannot be empty'));
    }

    // Validate URL format
    try {
      new URL(instanceUrl);
    } catch {
      return err(new Error('Invalid instance URL format'));
    }

    // Test the key with a health check
    const validation = await this.validateApiKey(instanceUrl, apiKey);
    if (!validation.ok) return validation;

    const auth: AuthState = {
      method: 'api_key',
      token: apiKey,
      instanceUrl,
      expiresAt: null,
      refreshToken: null,
    };

    await this.storeAuth(auth);
    return ok(auth);
  }

  /** Clear stored auth and disconnect */
  async clearAuth(): Promise<void> {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    await this.platform.persistentStorage.remove('auth');
    this.listener.onAuthChange(null);
  }

  private async handleOAuthCallback(
    redirectUrl: string,
    instanceUrl: string,
  ): Promise<Result<AuthState, Error>> {
    try {
      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');
      if (!code) {
        return err(new Error('No authorization code in OAuth callback'));
      }

      // Exchange code for token
      const response = await fetch(`${instanceUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          client_id: 'openclaw-extension',
          redirect_uri: `${instanceUrl}/oauth/callback`,
        }),
      });

      if (!response.ok) {
        return err(new Error(`OAuth token exchange failed: ${response.status}`));
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      const auth: AuthState = {
        method: 'oauth',
        token: data.access_token,
        instanceUrl,
        expiresAt: Date.now() + data.expires_in * 1000,
        refreshToken: data.refresh_token,
      };

      await this.storeAuth(auth);
      this.scheduleRefresh(auth);
      return ok(auth);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private async refreshOAuthToken(auth: AuthState): Promise<Result<AuthState, Error>> {
    if (!auth.refreshToken) {
      return err(new Error('No refresh token available'));
    }

    try {
      const response = await fetch(`${auth.instanceUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: auth.refreshToken,
          client_id: 'openclaw-extension',
        }),
      });

      if (!response.ok) {
        return err(new Error(`Token refresh failed: ${response.status}`));
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      const newAuth: AuthState = {
        method: 'oauth',
        token: data.access_token,
        instanceUrl: auth.instanceUrl,
        expiresAt: Date.now() + data.expires_in * 1000,
        refreshToken: data.refresh_token,
      };

      await this.storeAuth(newAuth);
      this.scheduleRefresh(newAuth);
      return ok(newAuth);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private async validateApiKey(instanceUrl: string, apiKey: string): Promise<Result<void, Error>> {
    try {
      const response = await fetch(`${instanceUrl}/api/health`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.status === 401 || response.status === 403) {
        return err(new Error('API key is invalid or revoked'));
      }

      if (!response.ok) {
        return err(new Error(`OpenClaw instance returned ${response.status}`));
      }

      return ok(undefined);
    } catch (e) {
      if (e instanceof TypeError && String(e).includes('fetch')) {
        return err(new Error('Cannot reach OpenClaw instance — check the URL'));
      }
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private async storeAuth(auth: AuthState): Promise<void> {
    await this.platform.persistentStorage.set('auth', auth);
    this.listener.onAuthChange(auth);
  }

  private scheduleRefresh(auth: AuthState): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (auth.method !== 'oauth' || !auth.expiresAt) return;

    // Refresh 5 minutes before expiry
    const refreshIn = auth.expiresAt - Date.now() - 5 * 60 * 1000;
    if (refreshIn <= 0) return;

    this.refreshTimer = setTimeout(async () => {
      const result = await this.refreshOAuthToken(auth);
      if (!result.ok) {
        // Refresh failed — notify for re-auth
        await this.clearAuth();
      }
    }, refreshIn);
  }
}
