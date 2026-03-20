/**
 * SQLite persistent storage for browser context.
 *
 * Stores every page visit, every interaction, every content snapshot.
 * Survives plugin restarts. Queryable by time, URL, domain, tab.
 *
 *   Tables:
 *   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 *   │ page_visits   │  │ interactions │  │ sessions     │
 *   │              │  │              │  │              │
 *   │ id           │  │ id           │  │ session_id   │
 *   │ session_id   │  │ visit_id     │  │ started_at   │
 *   │ tab_id       │  │ type         │  │ ext_version  │
 *   │ url          │  │ target       │  │ last_seen    │
 *   │ domain       │  │ value        │  └──────────────┘
 *   │ title        │  │ timestamp    │
 *   │ content      │  └──────────────┘
 *   │ site_data    │
 *   │ is_active    │
 *   │ time_spent_ms│
 *   │ scroll_depth │
 *   │ created_at   │
 *   └──────────────┘
 */

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR = path.join(os.homedir(), '.openclaw-extension');
const DB_PATH = path.join(DB_DIR, 'context.db');

export class ContextDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath ?? DB_PATH;
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    this.db = new Database(finalPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrent read/write
    this.db.pragma('busy_timeout = 5000');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        extension_version TEXT NOT NULL,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS page_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        tab_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        domain TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        content_length INTEGER NOT NULL DEFAULT 0,
        site_name TEXT,
        site_entity_type TEXT,
        site_data_json TEXT,
        is_active INTEGER NOT NULL DEFAULT 0,
        time_spent_ms INTEGER NOT NULL DEFAULT 0,
        scroll_depth REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );

      CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        visit_id INTEGER,
        tab_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        target_selector TEXT,
        target_tag TEXT,
        target_text TEXT,
        value TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(session_id),
        FOREIGN KEY (visit_id) REFERENCES page_visits(id)
      );

      CREATE INDEX IF NOT EXISTS idx_visits_session ON page_visits(session_id);
      CREATE INDEX IF NOT EXISTS idx_visits_domain ON page_visits(domain);
      CREATE INDEX IF NOT EXISTS idx_visits_created ON page_visits(created_at);
      CREATE INDEX IF NOT EXISTS idx_visits_url ON page_visits(url);
      CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_visit ON interactions(visit_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at);
    `);
  }

  // --- Sessions ---

  upsertSession(sessionId: string, extensionVersion: string): void {
    this.db.prepare(`
      INSERT INTO sessions (session_id, extension_version, started_at, last_seen_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(session_id) DO UPDATE SET last_seen_at = datetime('now')
    `).run(sessionId, extensionVersion);
  }

  // --- Page Visits ---

  insertVisit(params: {
    sessionId: string;
    tabId: number;
    url: string;
    title: string;
    content: string;
    siteName?: string;
    siteEntityType?: string;
    siteDataJson?: string;
    isActive: boolean;
    timeSpentMs?: number;
    scrollDepth?: number;
  }): number {
    let domain: string;
    try {
      domain = new URL(params.url).hostname;
    } catch {
      domain = params.url;
    }

    const result = this.db.prepare(`
      INSERT INTO page_visits (
        session_id, tab_id, url, domain, title, content, content_length,
        site_name, site_entity_type, site_data_json,
        is_active, time_spent_ms, scroll_depth
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.sessionId,
      params.tabId,
      params.url,
      domain,
      params.title,
      params.content,
      params.content.length,
      params.siteName ?? null,
      params.siteEntityType ?? null,
      params.siteDataJson ?? null,
      params.isActive ? 1 : 0,
      params.timeSpentMs ?? 0,
      params.scrollDepth ?? 0,
    );

    return Number(result.lastInsertRowid);
  }

  // --- Interactions ---

  insertInteraction(params: {
    sessionId: string;
    visitId?: number;
    tabId: number;
    type: string;
    url: string;
    targetSelector?: string;
    targetTag?: string;
    targetText?: string;
    value?: string;
  }): void {
    this.db.prepare(`
      INSERT INTO interactions (
        session_id, visit_id, tab_id, type, url,
        target_selector, target_tag, target_text, value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.sessionId,
      params.visitId ?? null,
      params.tabId,
      params.type,
      params.url,
      params.targetSelector ?? null,
      params.targetTag ?? null,
      params.targetText ?? null,
      params.value ?? null,
    );
  }

  // --- Queries ---

  /** Get recent page visits (last N minutes) */
  getRecentVisits(minutes: number = 30, limit: number = 50): PageVisitRow[] {
    return this.db.prepare(`
      SELECT * FROM page_visits
      WHERE created_at >= datetime('now', ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(`-${minutes} minutes`, limit) as PageVisitRow[];
  }

  /** Get visits for a specific domain */
  getVisitsByDomain(domain: string, limit: number = 20): PageVisitRow[] {
    return this.db.prepare(`
      SELECT * FROM page_visits
      WHERE domain = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(domain, limit) as PageVisitRow[];
  }

  /** Get interactions for a specific visit */
  getInteractionsForVisit(visitId: number): InteractionRow[] {
    return this.db.prepare(`
      SELECT * FROM interactions WHERE visit_id = ? ORDER BY created_at ASC
    `).all(visitId) as InteractionRow[];
  }

  /** Get recent interactions */
  getRecentInteractions(minutes: number = 30, limit: number = 100): InteractionRow[] {
    return this.db.prepare(`
      SELECT * FROM interactions
      WHERE created_at >= datetime('now', ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(`-${minutes} minutes`, limit) as InteractionRow[];
  }

  /** Get unique domains visited recently */
  getRecentDomains(minutes: number = 60): Array<{ domain: string; visit_count: number }> {
    return this.db.prepare(`
      SELECT domain, COUNT(*) as visit_count FROM page_visits
      WHERE created_at >= datetime('now', ?)
      GROUP BY domain
      ORDER BY visit_count DESC
    `).all(`-${minutes} minutes`) as Array<{ domain: string; visit_count: number }>;
  }

  /** Get browsing summary for LLM context */
  getBrowsingSummary(minutes: number = 15): BrowsingSummary {
    const visits = this.getRecentVisits(minutes, 30);
    const interactions = this.getRecentInteractions(minutes, 50);
    const domains = this.getRecentDomains(minutes);

    return {
      timeWindowMinutes: minutes,
      totalPageVisits: visits.length,
      totalInteractions: interactions.length,
      domainsVisited: domains,
      recentPages: visits.map((v) => ({
        url: v.url,
        title: v.title,
        domain: v.domain,
        contentPreview: v.content.slice(0, 200),
        contentLength: v.content_length,
        siteName: v.site_name,
        siteEntityType: v.site_entity_type,
        siteData: v.site_data_json ? JSON.parse(v.site_data_json) : null,
        isActive: v.is_active === 1,
        timeSpentMs: v.time_spent_ms,
        visitedAt: v.created_at,
      })),
      recentInteractions: interactions.map((i) => ({
        type: i.type,
        url: i.url,
        targetText: i.target_text,
        targetTag: i.target_tag,
        value: i.value,
        at: i.created_at,
      })),
    };
  }

  /** Build rich LLM-ready context string */
  buildLLMContext(minutes: number = 15): string {
    const summary = this.getBrowsingSummary(minutes);
    const parts: string[] = ['[BROWSER_CONTEXT]'];

    parts.push(`Time window: last ${minutes} minutes`);
    parts.push(`Pages visited: ${summary.totalPageVisits}`);
    parts.push(`Interactions: ${summary.totalInteractions}`);

    if (summary.domainsVisited.length > 0) {
      parts.push(`\nDomains: ${summary.domainsVisited.map((d) => `${d.domain} (${d.visit_count}x)`).join(', ')}`);
    }

    // Current/recent pages with content
    if (summary.recentPages.length > 0) {
      parts.push('\n--- Recent browsing ---');
      for (const page of summary.recentPages.slice(0, 10)) {
        parts.push(`\n[${page.visitedAt}] ${page.title}`);
        parts.push(`URL: ${page.url}`);
        if (page.siteName) {
          parts.push(`Site: ${page.siteName} (${page.siteEntityType})`);
          if (page.siteData) {
            parts.push(`Data: ${JSON.stringify(page.siteData)}`);
          }
        }
        if (page.contentPreview) {
          parts.push(`Content: ${page.contentPreview}...`);
        }
        if (page.timeSpentMs > 0) {
          parts.push(`Time spent: ${Math.round(page.timeSpentMs / 1000)}s`);
        }
      }
    }

    // Recent interactions
    if (summary.recentInteractions.length > 0) {
      parts.push('\n--- User actions ---');
      for (const action of summary.recentInteractions.slice(0, 20)) {
        const target = action.targetText ? ` "${action.targetText.slice(0, 50)}"` : '';
        parts.push(`[${action.at}] ${action.type}${target} on ${action.url}`);
      }
    }

    parts.push('\n[/BROWSER_CONTEXT]');
    return parts.join('\n');
  }

  /** Get database stats */
  getStats(): { visits: number; interactions: number; sessions: number; dbSizeMB: number } {
    const visits = (this.db.prepare('SELECT COUNT(*) as c FROM page_visits').get() as { c: number }).c;
    const interactions = (this.db.prepare('SELECT COUNT(*) as c FROM interactions').get() as { c: number }).c;
    const sessions = (this.db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }).c;
    const dbPath = this.db.name;
    let dbSizeMB = 0;
    try {
      const stat = fs.statSync(dbPath);
      dbSizeMB = Math.round(stat.size / 1024 / 1024 * 100) / 100;
    } catch { /* ok */ }
    return { visits, interactions, sessions, dbSizeMB };
  }

  close(): void {
    this.db.close();
  }
}

// --- Row types ---

export interface PageVisitRow {
  id: number;
  session_id: string;
  tab_id: number;
  url: string;
  domain: string;
  title: string;
  content: string;
  content_length: number;
  site_name: string | null;
  site_entity_type: string | null;
  site_data_json: string | null;
  is_active: number;
  time_spent_ms: number;
  scroll_depth: number;
  created_at: string;
}

export interface InteractionRow {
  id: number;
  session_id: string;
  visit_id: number | null;
  tab_id: number;
  type: string;
  url: string;
  target_selector: string | null;
  target_tag: string | null;
  target_text: string | null;
  value: string | null;
  created_at: string;
}

export interface BrowsingSummary {
  timeWindowMinutes: number;
  totalPageVisits: number;
  totalInteractions: number;
  domainsVisited: Array<{ domain: string; visit_count: number }>;
  recentPages: Array<{
    url: string;
    title: string;
    domain: string;
    contentPreview: string;
    contentLength: number;
    siteName: string | null;
    siteEntityType: string | null;
    siteData: unknown;
    isActive: boolean;
    timeSpentMs: number;
    visitedAt: string;
  }>;
  recentInteractions: Array<{
    type: string;
    url: string;
    targetText: string | null;
    targetTag: string | null;
    value: string | null;
    at: string;
  }>;
}
