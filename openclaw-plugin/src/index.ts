/**
 * OpenClaw Browser Context Plugin — main entry point.
 *
 * Starts a WebSocket server that accepts connections from the
 * OpenClaw Context Bridge browser extension. Integrates browser
 * context into OpenClaw's conversation and memory systems.
 *
 * Usage:
 *   npx ts-node src/index.ts                     # with defaults
 *   GATEWAY_URL=http://localhost:18789 \
 *   GATEWAY_TOKEN=your-token \
 *   PLUGIN_PORT=18790 \
 *   EXTENSION_TOKENS=token1,token2 \
 *     node dist/index.js                          # production
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │           OpenClaw Browser Context Plugin             │
 *   │                                                       │
 *   │  Extension ──wss://──▶ :18790/ws/extension            │
 *   │                            │                          │
 *   │                     ┌──────┴──────┐                   │
 *   │                     │  WSHandler  │                   │
 *   │                     └──────┬──────┘                   │
 *   │                            │                          │
 *   │              ┌─────────────┼─────────────┐            │
 *   │              ▼             ▼             ▼            │
 *   │       ContextStore   GatewayClient  SuggestionEngine  │
 *   │       (browser state) (OpenClaw API) (proactive help) │
 *   │                            │                          │
 *   │                            ▼                          │
 *   │                  OpenClaw Gateway :18789               │
 *   └──────────────────────────────────────────────────────┘
 */

import 'dotenv/config';

import { WebSocketServer } from 'ws';
import http from 'http';
import { DASHBOARD_HTML } from './dashboard.js';
import type { IncomingMessage } from 'http';
import type { PluginConfig, SuggestionMessage } from './types.js';
import { ContextStore } from './context-store.js';
import { ContextDatabase } from './database.js';
import { GatewayClient } from './gateway-client.js';
import { SuggestionEngine } from './suggestion-engine.js';
import { WSHandler } from './ws-handler.js';
import { utcTimestamp } from './utc-timestamp.js';

// --- Config from environment ---

function loadConfig(): PluginConfig {
  const tokens = (process.env['EXTENSION_TOKENS'] ?? 'dev-token').split(',').map((t) => t.trim());

  return {
    port: parseInt(process.env['PLUGIN_PORT'] ?? '18790', 10),
    tokens,
    gatewayUrl: process.env['GATEWAY_URL'] ?? 'http://localhost:18789',
    gatewayToken: process.env['GATEWAY_TOKEN'] ?? '',
    maxContextHistory: parseInt(process.env['MAX_CONTEXT_HISTORY'] ?? '100', 10),
    suggestionsEnabled: process.env['SUGGESTIONS_ENABLED'] !== 'false',
  };
}

// --- Auth ---

function authenticateRequest(req: IncomingMessage, config: PluginConfig): boolean {
  // Check Bearer token in Authorization header or as query param
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return config.tokens.includes(token);
  }

  // Fallback: token in query string (for WebSocket clients that can't set headers)
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    return config.tokens.includes(queryToken);
  }

  return false;
}

// --- Session cleanup ---

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function startSessionCleanup(contextStore: ContextStore): NodeJS.Timeout {
  return setInterval(() => {
    const stats = contextStore.getStats();
    if (stats.sessions > 0) {
      console.log(
        `[${utcTimestamp()}] [Plugin] Active sessions: ${stats.sessions}, tabs: ${stats.totalTabs}, history: ${stats.totalHistory}`,
      );
    }
  }, 60_000);
}

// --- Main ---

export function startPlugin(configOverride?: Partial<PluginConfig>): {
  server: http.Server;
  wss: WebSocketServer;
  contextStore: ContextStore;
  close: () => void;
} {
  const config = { ...loadConfig(), ...configOverride };
  const contextStore = new ContextStore(config.maxContextHistory);
  const database = new ContextDatabase();
  const gateway = new GatewayClient(config);
  const handlers = new Set<WSHandler>();

  console.log(`[${utcTimestamp()}] [DB] SQLite database at ~/.openclaw-extension/context.db`);

  // Suggestion callback — sends suggestion to the right connection
  function onSuggestion(suggestion: SuggestionMessage): void {
    for (const handler of handlers) {
      handler.send(suggestion);
    }
  }

  const suggestionEngine = new SuggestionEngine(contextStore, gateway, onSuggestion);

  // HTTP server for health check and WebSocket upgrade
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        ...contextStore.getStats(),
        connections: handlers.size,
      }));
      return;
    }

    if (req.url === '/api/health') {
      // Extension validates API key against this endpoint
      if (!authenticateRequest(req, config)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // --- Context API (pull model) ---
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    // CORS headers for browser-based consumers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const json = (data: unknown) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    };

    // Find the first active session (most common: single user)
    const sessionId = url.searchParams.get('session') ?? contextStore.getFirstSessionId() ?? '';

    if (url.pathname === '/context/active') {
      // Active tab — the page the user is currently looking at
      const active = contextStore.getActiveContext(sessionId);
      if (!active) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ active: false, message: 'No active tab' }));
        return;
      }
      json({
        active: true,
        tab: {
          url: active.url,
          title: active.title,
          content: active.content,
          siteData: active.siteData,
          lastUpdated: new Date(active.lastUpdated).toISOString(),
        },
      });
      return;
    }

    if (url.pathname === '/context/tabs') {
      // All open tabs
      const tabs = contextStore.getAllTabs(sessionId);
      json({
        count: tabs.length,
        tabs: tabs.map((t) => ({
          tabId: t.tabId,
          url: t.url,
          title: t.title,
          isActive: t.isActive,
          contentLength: t.content.length,
          siteData: t.siteData,
          lastUpdated: new Date(t.lastUpdated).toISOString(),
        })),
      });
      return;
    }

    if (url.pathname === '/context/history') {
      // Recent browsing history
      const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
      const history = contextStore.getHistory(sessionId, limit);
      json({
        count: history.length,
        entries: history.map((h) => ({
          url: h.url,
          title: h.title,
          contentLength: h.content.length,
          siteData: h.siteData,
          isActive: h.isActive,
          timestamp: new Date(h.timestamp).toISOString(),
        })),
      });
      return;
    }

    if (url.pathname === '/context/summary') {
      // LLM-ready context summary from SQLite — rich, persistent, queryable
      const minutes = parseInt(url.searchParams.get('minutes') ?? '15', 10);
      const summary = database.buildLLMContext(minutes);
      json({ summary });
      return;
    }

    if (url.pathname === '/context/stats') {
      json(database.getStats());
      return;
    }

    if (url.pathname === '/context/browsing') {
      // Full structured browsing summary
      const minutes = parseInt(url.searchParams.get('minutes') ?? '15', 10);
      json(database.getBrowsingSummary(minutes));
      return;
    }

    if (url.pathname === '/context/tab') {
      // Full content of a specific tab
      const tabId = parseInt(url.searchParams.get('id') ?? '0', 10);
      const tabs = contextStore.getAllTabs(sessionId);
      const tab = tabs.find((t) => t.tabId === tabId);
      if (!tab) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Tab not found' }));
        return;
      }
      json({
        tabId: tab.tabId,
        url: tab.url,
        title: tab.title,
        content: tab.content,
        siteData: tab.siteData,
        isActive: tab.isActive,
        lastUpdated: new Date(tab.lastUpdated).toISOString(),
      });
      return;
    }

    if (url.pathname === '/') {
      // Dashboard — live view of browser context
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(DASHBOARD_HTML);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  // WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws/extension' });

  wss.on('connection', (ws, req) => {
    // Authenticate
    if (!authenticateRequest(req, config)) {
      console.warn(`[${utcTimestamp()}] [Plugin] Rejected unauthenticated connection`);
      ws.close(4001, 'Unauthorized');
      return;
    }

    console.log(`[${utcTimestamp()}] [Plugin] Extension connected`);

    const handler = new WSHandler(ws, contextStore, database, gateway, suggestionEngine);
    handlers.add(handler);

    ws.on('close', () => {
      handlers.delete(handler);
      console.log(`[${utcTimestamp()}] [Plugin] Extension disconnected (${handlers.size} remaining)`);
    });
  });

  const cleanupTimer = startSessionCleanup(contextStore);

  server.listen(config.port, () => {
    console.log(`[${utcTimestamp()}] [OpenClaw Browser Context Plugin] Running on port ${config.port}`);
    console.log(`[${utcTimestamp()}]   Dashboard:     http://localhost:${config.port}/`);
    console.log(`[${utcTimestamp()}]   Context API:`);
    console.log(`[${utcTimestamp()}]     Active tab:  http://localhost:${config.port}/context/active`);
    console.log(`[${utcTimestamp()}]     All tabs:    http://localhost:${config.port}/context/tabs`);
    console.log(`[${utcTimestamp()}]     History:     http://localhost:${config.port}/context/history`);
    console.log(`[${utcTimestamp()}]     LLM Summary: http://localhost:${config.port}/context/summary`);
    console.log(`[${utcTimestamp()}]   WebSocket:     ws://localhost:${config.port}/ws/extension`);
    console.log(`[${utcTimestamp()}]   Tokens:        ${config.tokens.length} configured`);
  });

  return {
    server,
    wss,
    contextStore,
    close: () => {
      clearInterval(cleanupTimer);
      for (const handler of handlers) {
        handler.send({
          protocol_version: '1.0',
          type: 'backpressure',
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          payload: { action: 'slow_down', max_rate_per_minute: 0, reason: 'Server shutting down' },
        });
      }
      wss.close();
      server.close();
      database.close();
    },
  };
}

// --- CLI entry point ---
if (process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts')) {
  startPlugin();
}
