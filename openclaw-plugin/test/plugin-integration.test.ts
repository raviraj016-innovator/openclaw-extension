import { describe, it, expect, afterEach, vi } from 'vitest';
import { startPlugin } from '../src/index.js';
import WebSocket from 'ws';

// Mock fetch for gateway calls
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ status: 'ok' }),
}));

describe('Plugin Integration', () => {
  let plugin: ReturnType<typeof startPlugin> | null = null;

  afterEach(() => {
    plugin?.close();
    plugin = null;
  });

  it('starts and accepts connections with valid token', async () => {
    plugin = startPlugin({
      port: 0, // random port
      tokens: ['test-token'],
      gatewayUrl: 'http://localhost:18789',
      gatewayToken: 'gw-token',
      suggestionsEnabled: false,
    });

    // Wait for server to be listening
    await new Promise<void>((resolve) => {
      plugin!.server.once('listening', resolve);
    });

    const address = plugin.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    // Connect with valid token
    const ws = new WebSocket(`ws://localhost:${port}/ws/extension`, {
      headers: { Authorization: 'Bearer test-token' },
    });

    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('rejects connections without valid token', async () => {
    plugin = startPlugin({
      port: 0,
      tokens: ['test-token'],
      gatewayUrl: 'http://localhost:18789',
      gatewayToken: 'gw-token',
      suggestionsEnabled: false,
    });

    await new Promise<void>((resolve) => {
      plugin!.server.once('listening', resolve);
    });

    const address = plugin!.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const ws = new WebSocket(`ws://localhost:${port}/ws/extension`, {
      headers: { Authorization: 'Bearer wrong-token' },
    });

    const closeCode = await new Promise<number>((resolve) => {
      ws.on('close', (code) => resolve(code));
    });

    expect(closeCode).toBe(4001);
  });

  it('responds to ping with pong', async () => {
    plugin = startPlugin({
      port: 0,
      tokens: ['test-token'],
      gatewayUrl: 'http://localhost:18789',
      gatewayToken: 'gw-token',
      suggestionsEnabled: false,
    });

    await new Promise<void>((resolve) => {
      plugin!.server.once('listening', resolve);
    });

    const address = plugin!.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const ws = new WebSocket(`ws://localhost:${port}/ws/extension`, {
      headers: { Authorization: 'Bearer test-token' },
    });

    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    // Send ping
    const pongPromise = new Promise<string>((resolve) => {
      ws.on('message', (data) => resolve(String(data)));
    });

    ws.send(JSON.stringify({
      protocol_version: '1.0',
      type: 'ping',
      id: 'test-ping',
      timestamp: new Date().toISOString(),
    }));

    const response = await pongPromise;
    const parsed = JSON.parse(response);
    expect(parsed.type).toBe('pong');

    ws.close();
  });

  it('stores context from context_update messages', async () => {
    plugin = startPlugin({
      port: 0,
      tokens: ['test-token'],
      gatewayUrl: 'http://localhost:18789',
      gatewayToken: 'gw-token',
      suggestionsEnabled: false,
    });

    await new Promise<void>((resolve) => {
      plugin!.server.once('listening', resolve);
    });

    const address = plugin!.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const ws = new WebSocket(`ws://localhost:${port}/ws/extension`, {
      headers: { Authorization: 'Bearer test-token' },
    });

    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    // Send context update
    ws.send(JSON.stringify({
      protocol_version: '1.0',
      type: 'context_update',
      id: 'ctx-1',
      timestamp: new Date().toISOString(),
      session_id: 'test-session',
      sequence: 1,
      extension_version: '0.1.0',
      payload: {
        tab_id: 1,
        url: 'https://github.com/test/repo',
        title: 'Test Repo',
        content: 'Repository content',
        site_data: null,
        meta: {},
        classification: 'allowed',
        is_active_tab: true,
      },
    }));

    // Wait for processing
    await new Promise((r) => setTimeout(r, 100));

    // Verify context was stored
    const tabs = plugin!.contextStore.getAllTabs('test-session');
    expect(tabs).toHaveLength(1);
    expect(tabs[0]!.url).toBe('https://github.com/test/repo');

    ws.close();
  });

  it('serves health endpoint', async () => {
    plugin = startPlugin({
      port: 0,
      tokens: ['test-token'],
      gatewayUrl: 'http://localhost:18789',
      gatewayToken: 'gw-token',
      suggestionsEnabled: false,
    });

    await new Promise<void>((resolve) => {
      plugin!.server.once('listening', resolve);
    });

    const address = plugin!.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    // Use real fetch (not the vi.fn mock) via http.get
    const http = await import('http');
    const data = await new Promise<Record<string, unknown>>((resolve) => {
      http.get(`http://localhost:${port}/health`, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve(JSON.parse(body)));
      });
    });

    expect(data['status']).toBe('ok');
    expect(data['sessions']).toBe(0);
    expect(data['connections']).toBe(0);
  });
});
