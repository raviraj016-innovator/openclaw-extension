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
 *   │                            │ emit                     │
 *   │                     ┌──────┴──────┐                   │
 *   │                     │ EventPipeline│                  │
 *   │                     └──────┬──────┘                   │
 *   │              ┌─────────────┼─────────────┐            │
 *   │              ▼             ▼             ▼            │
 *   │       ContactProcessor InteractionProc SuggestionProc │
 *   │              │             │             │            │
 *   │              ▼             ▼             ▼            │
 *   │       ContextStore   ContextDB    GatewayClient       │
 *   │       (browser state) (SQLite)   (OpenClaw API)       │
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
import { EventPipeline } from './event-pipeline.js';
import { ContactProcessor } from './contact-processor.js';
import { InteractionProcessor } from './interaction-processor.js';
import { utcTimestamp } from './utc-timestamp.js';
import { ChatHandler } from './chat-handler.js';

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

  // Chat handler — uses Anthropic API to answer questions about browsing context
  const anthropicKey = process.env['ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_KEY'] ?? '';
  const chatHandler = new ChatHandler(database, anthropicKey);
  if (anthropicKey) {
    console.log(`[${utcTimestamp()}] [Chat] Anthropic API key configured`);
  } else {
    console.log(`[${utcTimestamp()}] [Chat] No Anthropic API key — chat will return raw context`);
  }

  // Suggestion callback — sends suggestion to the right connection
  function onSuggestion(suggestion: SuggestionMessage): void {
    for (const handler of handlers) {
      handler.send(suggestion);
    }
  }

  const suggestionEngine = new SuggestionEngine(contextStore, gateway, onSuggestion);

  // Event pipeline — processors subscribe to context events
  const pipeline = new EventPipeline();
  pipeline.register(new ContactProcessor(database, anthropicKey));
  pipeline.register(new InteractionProcessor(database));
  // SuggestionEngine as a pipeline processor
  pipeline.register({
    name: 'suggestion-engine',
    process(event) {
      if (event.type === 'context_update') {
        suggestionEngine.evaluate(event.sessionId, event.payload);
      }
    },
  });
  console.log(`[${utcTimestamp()}] [Pipeline] Registered 3 event processors`);

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
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const json = (data: unknown, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    };

    // Find the first active session (most common: single user)
    const sessionId = url.searchParams.get('session') ?? contextStore.getFirstSessionId() ?? '';

    if (url.pathname === '/context/active') {
      // Active tab — the page the user is currently looking at
      const active = contextStore.getActiveContext(sessionId);
      if (!active) {
        json({ active: false, message: 'No active tab' });
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

    if (url.pathname === '/chat' && req.method === 'POST') {
      // AI chat — ask questions about browsing context
      chatHandler.handleChat(req, res);
      return;
    }

    // --- Contacts API ---
    if (url.pathname === '/contacts' && req.method === 'GET') {
      const q = url.searchParams.get('q');
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 500);
      const contacts = q
        ? database.searchContacts(q, limit)
        : database.getAllContacts(limit);
      json({ count: contacts.length, contacts });
      return;
    }

    if (url.pathname === '/contacts/stats') {
      json(database.getContactStats());
      return;
    }

    if (url.pathname === '/contacts/health') {
      json(database.getContactHealthStats());
      return;
    }

    if (url.pathname === '/contacts/linkedin-stats') {
      json(database.getLinkedInStats());
      return;
    }

    if (url.pathname === '/contacts/companies') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100);
      json(database.getContactsByCompany(limit));
      return;
    }

    if (url.pathname === '/contacts/merge-candidates') {
      json({ candidates: database.findMergeCandidates() });
      return;
    }

    if (url.pathname === '/contacts/export/csv') {
      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="openclaw-contacts.csv"',
      });
      res.end(database.exportContactsCSV());
      return;
    }

    if (url.pathname === '/contacts/export/vcard') {
      res.writeHead(200, {
        'Content-Type': 'text/vcard',
        'Content-Disposition': 'attachment; filename="openclaw-contacts.vcf"',
      });
      res.end(database.exportContactsVCard());
      return;
    }

    // DELETE /contacts/:id
    const contactDeleteMatch = url.pathname.match(/^\/contacts\/(\d+)$/);
    if (contactDeleteMatch && req.method === 'DELETE') {
      const id = parseInt(contactDeleteMatch[1]!, 10);
      const deleted = database.deleteContact(id);
      if (deleted) {
        json({ success: true, id });
      } else {
        json({ error: 'Contact not found' }, 404);
      }
      return;
    }

    // GET /contacts/:id
    if (contactDeleteMatch && req.method === 'GET') {
      const id = parseInt(contactDeleteMatch[1]!, 10);
      const contact = database.getContact(id);
      if (contact) {
        json(contact);
      } else {
        json({ error: 'Contact not found' }, 404);
      }
      return;
    }

    // --- Persons API ---
    const personTimelineMatch = url.pathname.match(/^\/persons\/(\d+)\/timeline$/);
    if (personTimelineMatch) {
      const personId = parseInt(personTimelineMatch[1]!, 10);
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
      json(database.getPersonTimeline(personId, limit));
      return;
    }

    const personContactsMatch = url.pathname.match(/^\/persons\/(\d+)\/contacts$/);
    if (personContactsMatch) {
      const personId = parseInt(personContactsMatch[1]!, 10);
      json({ contacts: database.getPersonContacts(personId) });
      return;
    }

    const personScoreMatch = url.pathname.match(/^\/persons\/(\d+)\/score$/);
    if (personScoreMatch) {
      const personId = parseInt(personScoreMatch[1]!, 10);
      json(database.getRelationshipScore(personId));
      return;
    }

    // POST /persons/merge
    if (url.pathname === '/persons/merge' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const { keepId, mergeId } = JSON.parse(body);
          if (!keepId || !mergeId) {
            json({ error: 'keepId and mergeId required' }, 400);
            return;
          }
          database.mergePersons(keepId, mergeId);
          json({ success: true, keptPersonId: keepId });
        } catch (e) {
          json({ error: e instanceof Error ? e.message : String(e) }, 400);
        }
      });
      return;
    }

    if (url.pathname === '/context/tab') {
      // Full content of a specific tab
      const tabId = parseInt(url.searchParams.get('id') ?? '0', 10);
      const tabs = contextStore.getAllTabs(sessionId);
      const tab = tabs.find((t) => t.tabId === tabId);
      if (!tab) {
        json({ error: 'Tab not found' }, 404);
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

    json({ error: 'Not found' }, 404);
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

    const handler = new WSHandler(ws, contextStore, database, gateway, pipeline);
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
    console.log(`[${utcTimestamp()}]     Contacts:    http://localhost:${config.port}/contacts`);
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
