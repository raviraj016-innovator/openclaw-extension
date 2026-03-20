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
 *   │ content      │  └──────────────┘  ┌──────────────┐
 *   │ site_data    │                    │ persons      │
 *   │ is_active    │  ┌──────────────┐  │              │
 *   │ time_spent_ms│  │ contacts     │  │ id           │
 *   │ scroll_depth │  │              │  │ uuid         │
 *   │ person_id    │  │ id           │  │ display_name │
 *   │ created_at   │  │ person_id    │  │ merged_from  │
 *   └──────────────┘  │ name         │  │ created_at   │
 *                     │ headline     │  │ updated_at   │
 *                     │ company      │  └──────────────┘
 *                     │ email        │
 *                     │ platform     │  ┌──────────────────┐
 *                     │ linkedin_url │  │ contacts_fts     │
 *                     │ github_url   │  │ (FTS5 virtual)   │
 *                     │ twitter_url  │  │                  │
 *                     │ instagram_url│  │ name             │
 *                     │ facebook_url │  │ headline         │
 *                     │ last_seen_at │  │ company          │
 *                     │ times_viewed │  │ email            │
 *                     │ ...          │  └──────────────────┘
 *                     └──────────────┘
 */

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR = path.join(os.homedir(), '.openclaw-extension');
const DB_PATH = path.join(DB_DIR, 'context.db');

const VALID_PLATFORM_COLUMNS = ['linkedin_url', 'github_url', 'twitter_url', 'instagram_url', 'facebook_url'] as const;

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

      CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
        display_name TEXT NOT NULL,
        merged_from TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
        person_id INTEGER REFERENCES persons(id),
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
      CREATE INDEX IF NOT EXISTS idx_visits_person ON page_visits(person_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_visit ON interactions(visit_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at);

      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER REFERENCES persons(id),
        name TEXT NOT NULL,
        headline TEXT,
        company TEXT,
        role TEXT,
        location TEXT,
        bio TEXT,
        email TEXT,
        email_source TEXT,
        email_confidence REAL DEFAULT 0,
        phone TEXT,
        website TEXT,
        linkedin_url TEXT UNIQUE,
        twitter_url TEXT UNIQUE,
        github_url TEXT UNIQUE,
        instagram_url TEXT UNIQUE,
        facebook_url TEXT UNIQUE,
        other_urls TEXT,
        profile_image_url TEXT,
        tags TEXT,
        notes TEXT,
        source_page_url TEXT NOT NULL,
        platform TEXT NOT NULL,
        first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        times_viewed INTEGER NOT NULL DEFAULT 1,
        raw_data TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
      CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
      CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
      CREATE INDEX IF NOT EXISTS idx_contacts_linkedin ON contacts(linkedin_url);
      CREATE INDEX IF NOT EXISTS idx_contacts_github ON contacts(github_url);
      CREATE INDEX IF NOT EXISTS idx_contacts_twitter ON contacts(twitter_url);
      CREATE INDEX IF NOT EXISTS idx_contacts_person ON contacts(person_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_last_seen ON contacts(last_seen_at);
    `);

    // --- Incremental migrations for existing databases ---
    this.addColumnIfMissing('contacts', 'person_id', 'INTEGER REFERENCES persons(id)');
    this.addColumnIfMissing('contacts', 'facebook_url', 'TEXT UNIQUE');
    this.addColumnIfMissing('page_visits', 'person_id', 'INTEGER REFERENCES persons(id)');

    // LinkedIn Premium / Sales Navigator fields
    this.addColumnIfMissing('contacts', 'connection_degree', 'TEXT');
    this.addColumnIfMissing('contacts', 'mutual_connections', 'INTEGER');
    this.addColumnIfMissing('contacts', 'lead_tags', 'TEXT');  // JSON array
    this.addColumnIfMissing('contacts', 'is_premium_data', 'INTEGER DEFAULT 0');
    this.addColumnIfMissing('contacts', 'source_type', "TEXT DEFAULT 'standard'");  // 'standard' | 'sales_nav'
    this.addColumnIfMissing('contacts', 'company_visits', 'INTEGER DEFAULT 0');
    this.addColumnIfMissing('contacts', 'sales_nav_url', 'TEXT');

    // FTS5 virtual table (idempotent — check if it exists first)
    const ftsExists = this.db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='contacts_fts'`
    ).get();
    if (!ftsExists) {
      this.db.exec(`
        CREATE VIRTUAL TABLE contacts_fts USING fts5(
          name, headline, company, email,
          content=contacts, content_rowid=id
        );

        CREATE TRIGGER IF NOT EXISTS contacts_ai AFTER INSERT ON contacts BEGIN
          INSERT INTO contacts_fts(rowid, name, headline, company, email)
          VALUES (new.id, new.name, new.headline, new.company, new.email);
        END;

        CREATE TRIGGER IF NOT EXISTS contacts_ad AFTER DELETE ON contacts BEGIN
          INSERT INTO contacts_fts(contacts_fts, rowid, name, headline, company, email)
          VALUES ('delete', old.id, old.name, old.headline, old.company, old.email);
        END;

        CREATE TRIGGER IF NOT EXISTS contacts_au AFTER UPDATE ON contacts BEGIN
          INSERT INTO contacts_fts(contacts_fts, rowid, name, headline, company, email)
          VALUES ('delete', old.id, old.name, old.headline, old.company, old.email);
          INSERT INTO contacts_fts(rowid, name, headline, company, email)
          VALUES (new.id, new.name, new.headline, new.company, new.email);
        END;
      `);
    }
  }

  /** Add a column to a table if it doesn't already exist */
  private addColumnIfMissing(table: string, column: string, definition: string): void {
    const cols = this.db.pragma(`table_info(${table})`) as Array<{ name: string }>;
    if (cols.length > 0 && !cols.some((c) => c.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
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
    personId?: number;
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
        is_active, time_spent_ms, scroll_depth, person_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      params.personId ?? null,
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

  // --- Contacts ---

  /** Validate that a platform URL column name is in the allowlist */
  private validatePlatformUrlCol(platformUrlCol: string): asserts platformUrlCol is typeof VALID_PLATFORM_COLUMNS[number] {
    if (!(VALID_PLATFORM_COLUMNS as readonly string[]).includes(platformUrlCol)) {
      throw new Error(`Invalid platform URL column: ${platformUrlCol}. Must be one of: ${VALID_PLATFORM_COLUMNS.join(', ')}`);
    }
  }

  /** Upsert a contact -- insert or update on platform URL match */
  upsertContact(contact: ContactInput): number {
    const platformUrlCol = `${contact.platform}_url`;
    this.validatePlatformUrlCol(platformUrlCol);

    // Check if contact exists by platform URL
    const existing = this.db.prepare(
      `SELECT id, times_viewed, person_id FROM contacts WHERE ${platformUrlCol} = ?`
    ).get(contact.profileUrl) as { id: number; times_viewed: number; person_id: number | null } | undefined;

    if (existing) {
      // Update existing contact — keep existing person_id
      this.db.prepare(`
        UPDATE contacts SET
          name = COALESCE(?, name),
          headline = COALESCE(?, headline),
          company = COALESCE(?, company),
          role = COALESCE(?, role),
          location = COALESCE(?, location),
          bio = COALESCE(?, bio),
          email = COALESCE(?, email),
          email_source = COALESCE(?, email_source),
          email_confidence = CASE WHEN ? > email_confidence THEN ? ELSE email_confidence END,
          website = COALESCE(?, website),
          profile_image_url = COALESCE(?, profile_image_url),
          last_seen_at = datetime('now'),
          times_viewed = times_viewed + 1,
          raw_data = ?
        WHERE id = ?
      `).run(
        contact.name, contact.headline, contact.company, contact.role,
        contact.location, contact.bio, contact.email, contact.emailSource,
        contact.emailConfidence ?? 0, contact.emailConfidence ?? 0,
        contact.website, contact.profileImageUrl,
        contact.rawData ? JSON.stringify(contact.rawData) : null,
        existing.id,
      );
      return existing.id;
    }

    // Insert new contact
    const result = this.db.prepare(`
      INSERT INTO contacts (
        name, headline, company, role, location, bio,
        email, email_source, email_confidence,
        website, ${platformUrlCol},
        profile_image_url, source_page_url, platform, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contact.name, contact.headline ?? null, contact.company ?? null,
      contact.role ?? null, contact.location ?? null, contact.bio ?? null,
      contact.email ?? null, contact.emailSource ?? null, contact.emailConfidence ?? 0,
      contact.website ?? null, contact.profileUrl,
      contact.profileImageUrl ?? null, contact.profileUrl, contact.platform,
      contact.rawData ? JSON.stringify(contact.rawData) : null,
    );

    const contactId = Number(result.lastInsertRowid);

    // Auto-create a person and link it
    this.createPersonForContact(contactId);

    return contactId;
  }

  /** Search contacts by name, company, or email. Uses FTS5 with LIKE fallback. */
  searchContacts(query: string, limit: number = 20): ContactRow[] {
    // Try FTS5 first
    try {
      const ftsQuery = query.replace(/['"]/g, '').trim();
      if (ftsQuery.length > 0) {
        // FTS5 match query — quote the term for phrase matching, use * for prefix
        const ftsSearchTerm = `"${ftsQuery}"*`;
        const results = this.db.prepare(`
          SELECT c.* FROM contacts c
          JOIN contacts_fts fts ON c.id = fts.rowid
          WHERE contacts_fts MATCH ?
          ORDER BY c.last_seen_at DESC
          LIMIT ?
        `).all(ftsSearchTerm, limit) as ContactRow[];
        return results;
      }
    } catch {
      // FTS5 failed, fall back to LIKE
    }

    // Fallback: LIKE with escaped wildcards
    const escaped = query
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    const q = `%${escaped}%`;
    return this.db.prepare(`
      SELECT * FROM contacts
      WHERE name LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR headline LIKE ? ESCAPE '\\'
      ORDER BY last_seen_at DESC
      LIMIT ?
    `).all(q, q, q, q, limit) as ContactRow[];
  }

  /** Get all contacts, most recently seen first */
  getAllContacts(limit: number = 100): ContactRow[] {
    return this.db.prepare(`
      SELECT * FROM contacts ORDER BY last_seen_at DESC LIMIT ?
    `).all(limit) as ContactRow[];
  }

  /** Get a single contact by ID */
  getContact(id: number): ContactRow | undefined {
    return this.db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRow | undefined;
  }

  /** Delete a contact by ID. Returns true if a row was deleted. */
  deleteContact(id: number): boolean {
    const result = this.db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /** Set person_id on a page_visit row (links the visit to a person for timeline/scoring) */
  setVisitPersonId(visitId: number, personId: number): void {
    this.db.prepare('UPDATE page_visits SET person_id = ? WHERE id = ?').run(personId, visitId);
  }

  /** Update LinkedIn-specific fields from rawData after upsert */
  updateContactLinkedInFields(contactId: number, rawData: Record<string, unknown>): void {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (rawData.connectionDegree) {
      updates.push('connection_degree = ?');
      params.push(rawData.connectionDegree);
    }
    if (typeof rawData.mutualConnections === 'number') {
      updates.push('mutual_connections = ?');
      params.push(rawData.mutualConnections);
    }
    if (Array.isArray(rawData.leadTags) && rawData.leadTags.length > 0) {
      updates.push('lead_tags = ?');
      params.push(JSON.stringify(rawData.leadTags));
    }
    if (rawData.isPremiumData) {
      updates.push('is_premium_data = 1');
    }
    if (rawData.sourceType) {
      updates.push('source_type = ?');
      params.push(rawData.sourceType);
    }
    if (rawData.salesNavUrl) {
      updates.push('sales_nav_url = ?');
      params.push(rawData.salesNavUrl);
    }

    if (updates.length === 0) return;

    params.push(contactId);
    this.db.prepare(
      `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`
    ).run(...params);
  }

  /** Increment company_visits for all contacts at a given company */
  incrementCompanyVisits(companyName: string): number {
    const result = this.db.prepare(
      `UPDATE contacts SET company_visits = COALESCE(company_visits, 0) + 1 WHERE company = ?`
    ).run(companyName);
    return result.changes;
  }

  /** Update contact email (from AI inference or manual edit) */
  updateContactEmail(id: number, email: string, source: string, confidence: number): void {
    this.db.prepare(`
      UPDATE contacts SET email = ?, email_source = ?, email_confidence = ?
      WHERE id = ? AND (email IS NULL OR email_confidence < ?)
    `).run(email, source, confidence, id, confidence);
  }

  /** Get contact stats */
  getContactStats(): { total: number; withEmail: number; platforms: Record<string, number> } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM contacts').get() as { c: number }).c;
    const withEmail = (this.db.prepare('SELECT COUNT(*) as c FROM contacts WHERE email IS NOT NULL').get() as { c: number }).c;
    const platformRows = this.db.prepare('SELECT platform, COUNT(*) as c FROM contacts GROUP BY platform').all() as Array<{ platform: string; c: number }>;
    const platforms: Record<string, number> = {};
    for (const row of platformRows) {
      platforms[row.platform] = row.c;
    }
    return { total, withEmail, platforms };
  }

  /** Get LinkedIn-specific stats for the dashboard */
  getLinkedInStats(): { total: number; fromSalesNav: number; withEmail: number; topCompanies: Array<{ company: string; count: number }> } {
    const total = (this.db.prepare("SELECT COUNT(*) as c FROM contacts WHERE platform = 'linkedin'").get() as { c: number }).c;
    const fromSalesNav = (this.db.prepare("SELECT COUNT(*) as c FROM contacts WHERE platform = 'linkedin' AND source_type = 'sales_nav'").get() as { c: number }).c;
    const withEmail = (this.db.prepare("SELECT COUNT(*) as c FROM contacts WHERE platform = 'linkedin' AND email IS NOT NULL AND email != ''").get() as { c: number }).c;
    const topCompanies = this.db.prepare(
      "SELECT company, COUNT(*) as count FROM contacts WHERE platform = 'linkedin' AND company IS NOT NULL AND company != '' GROUP BY company ORDER BY count DESC LIMIT 5"
    ).all() as Array<{ company: string; count: number }>;
    return { total, fromSalesNav, withEmail, topCompanies };
  }

  // --- Persons ---

  /** Create a person for a contact (auto-link). Returns the person ID. */
  createPersonForContact(contactId: number): number {
    const contact = this.getContact(contactId);
    if (!contact) {
      throw new Error(`Contact with id ${contactId} not found`);
    }

    const displayName = contact.name;
    const result = this.db.prepare(`
      INSERT INTO persons (display_name) VALUES (?)
    `).run(displayName);

    const personId = Number(result.lastInsertRowid);

    this.db.prepare(`
      UPDATE contacts SET person_id = ? WHERE id = ?
    `).run(personId, contactId);

    return personId;
  }

  /** Get all contacts linked to a person */
  getPersonContacts(personId: number): ContactRow[] {
    return this.db.prepare(`
      SELECT * FROM contacts WHERE person_id = ? ORDER BY last_seen_at DESC
    `).all(personId) as ContactRow[];
  }

  /** Find contacts that might be the same person (match by normalized name + company) */
  findMergeCandidates(): MergeCandidate[] {
    const rows = this.db.prepare(`
      SELECT
        a.id AS id_a,
        b.id AS id_b,
        a.person_id AS person_id_a,
        b.person_id AS person_id_b,
        a.name AS name_a,
        b.name AS name_b,
        a.company AS company_a,
        b.company AS company_b,
        a.platform AS platform_a,
        b.platform AS platform_b
      FROM contacts a
      JOIN contacts b ON a.id < b.id
      WHERE LOWER(TRIM(a.name)) = LOWER(TRIM(b.name))
        AND a.company IS NOT NULL
        AND b.company IS NOT NULL
        AND LOWER(TRIM(a.company)) = LOWER(TRIM(b.company))
        AND (a.person_id IS NULL OR b.person_id IS NULL OR a.person_id != b.person_id)
    `).all() as Array<{
      id_a: number; id_b: number;
      person_id_a: number | null; person_id_b: number | null;
      name_a: string; name_b: string;
      company_a: string; company_b: string;
      platform_a: string; platform_b: string;
    }>;

    return rows.map((row) => {
      // Confidence: 0.7 base for name+company match, +0.2 if different platforms
      let confidence = 0.7;
      if (row.platform_a !== row.platform_b) {
        confidence += 0.2;
      }
      return {
        contactIdA: row.id_a,
        contactIdB: row.id_b,
        personIdA: row.person_id_a,
        personIdB: row.person_id_b,
        nameA: row.name_a,
        nameB: row.name_b,
        companyA: row.company_a,
        companyB: row.company_b,
        platformA: row.platform_a,
        platformB: row.platform_b,
        confidence,
      };
    });
  }

  /** Merge two persons: reassign all contacts from mergeId to keepId */
  mergePersons(keepId: number, mergeId: number): void {
    const keepPerson = this.db.prepare('SELECT * FROM persons WHERE id = ?').get(keepId) as PersonRow | undefined;
    const mergePerson = this.db.prepare('SELECT * FROM persons WHERE id = ?').get(mergeId) as PersonRow | undefined;

    if (!keepPerson) throw new Error(`Person with id ${keepId} not found`);
    if (!mergePerson) throw new Error(`Person with id ${mergeId} not found`);

    const merge = this.db.transaction(() => {
      // Reassign contacts
      this.db.prepare(`
        UPDATE contacts SET person_id = ? WHERE person_id = ?
      `).run(keepId, mergeId);

      // Reassign page_visits
      this.db.prepare(`
        UPDATE page_visits SET person_id = ? WHERE person_id = ?
      `).run(keepId, mergeId);

      // Track merged IDs
      const existingMerged: number[] = keepPerson.merged_from ? JSON.parse(keepPerson.merged_from) : [];
      const mergedMerged: number[] = mergePerson.merged_from ? JSON.parse(mergePerson.merged_from) : [];
      const allMerged = [...existingMerged, mergeId, ...mergedMerged];

      this.db.prepare(`
        UPDATE persons SET merged_from = ?, updated_at = datetime('now') WHERE id = ?
      `).run(JSON.stringify(allMerged), keepId);

      // Delete the merged person
      this.db.prepare('DELETE FROM persons WHERE id = ?').run(mergeId);
    });

    merge();
  }

  /** Get interaction timeline for a person */
  getPersonTimeline(personId: number, limit: number = 50): TimelineEntry[] {
    const rows = this.db.prepare(`
      SELECT
        'visit' AS entry_type,
        pv.id AS entry_id,
        pv.url AS url,
        pv.title AS title,
        pv.domain AS domain,
        NULL AS interaction_type,
        NULL AS target_text,
        pv.time_spent_ms AS time_spent_ms,
        pv.created_at AS created_at
      FROM page_visits pv
      WHERE pv.person_id = ?

      UNION ALL

      SELECT
        'interaction' AS entry_type,
        i.id AS entry_id,
        i.url AS url,
        NULL AS title,
        NULL AS domain,
        i.type AS interaction_type,
        i.target_text AS target_text,
        NULL AS time_spent_ms,
        i.created_at AS created_at
      FROM interactions i
      JOIN page_visits pv ON i.visit_id = pv.id
      WHERE pv.person_id = ?

      ORDER BY created_at DESC
      LIMIT ?
    `).all(personId, personId, limit) as Array<{
      entry_type: string;
      entry_id: number;
      url: string;
      title: string | null;
      domain: string | null;
      interaction_type: string | null;
      target_text: string | null;
      time_spent_ms: number | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      entryType: row.entry_type as 'visit' | 'interaction',
      entryId: row.entry_id,
      url: row.url,
      title: row.title,
      domain: row.domain,
      interactionType: row.interaction_type,
      targetText: row.target_text,
      timeSpentMs: row.time_spent_ms,
      createdAt: row.created_at,
    }));
  }

  // --- Relationship Scoring ---

  /** Compute a relationship score for a person (0-100) */
  getRelationshipScore(personId: number): RelationshipScore {
    const contacts = this.getPersonContacts(personId);

    if (contacts.length === 0) {
      return {
        personId,
        totalViews: 0,
        recencyDays: null,
        platformCount: 0,
        interactionCount: 0,
        score: 0,
      };
    }

    // Total views
    const totalViews = contacts.reduce((sum, c) => sum + c.times_viewed, 0);

    // Recency: days since most recent last_seen_at
    const mostRecent = contacts.reduce((latest, c) => {
      return c.last_seen_at > latest ? c.last_seen_at : latest;
    }, contacts[0]!.last_seen_at);
    const recencyMs = Date.now() - new Date(mostRecent + 'Z').getTime();
    const recencyDays = Math.max(0, Math.floor(recencyMs / (1000 * 60 * 60 * 24)));

    // Recency bonus
    let recencyBonus = 0;
    if (recencyDays <= 7) {
      recencyBonus = 30;
    } else if (recencyDays <= 30) {
      recencyBonus = 15;
    }

    // Platform diversity
    const platforms = new Set(contacts.map((c) => c.platform));
    const platformCount = platforms.size;

    // Interaction count via page_visits linked to this person
    const interactionCount = (this.db.prepare(`
      SELECT COUNT(*) as c FROM interactions i
      JOIN page_visits pv ON i.visit_id = pv.id
      WHERE pv.person_id = ?
    `).get(personId) as { c: number }).c;

    // Score formula
    const score = Math.min(100, totalViews * 5 + recencyBonus + platformCount * 15 + interactionCount * 3);

    return {
      personId,
      totalViews,
      recencyDays,
      platformCount,
      interactionCount,
      score,
    };
  }

  // --- Company Grouping ---

  /** Get contacts grouped by company (single query, grouped in JS) */
  getContactsByCompany(limit: number = 50): CompanyGroup[] {
    // Get top companies by contact count, then fetch all their contacts in one query
    const topCompanies = this.db.prepare(`
      SELECT company
      FROM contacts
      WHERE company IS NOT NULL AND company != ''
      GROUP BY company
      ORDER BY COUNT(*) DESC
      LIMIT ?
    `).all(limit) as Array<{ company: string }>;

    if (topCompanies.length === 0) return [];

    const placeholders = topCompanies.map(() => '?').join(',');
    const companyNames = topCompanies.map((c) => c.company);

    const allContacts = this.db.prepare(`
      SELECT * FROM contacts
      WHERE company IN (${placeholders})
      ORDER BY company, last_seen_at DESC
    `).all(...companyNames) as ContactRow[];

    // Group by company in JS
    const groups = new Map<string, ContactRow[]>();
    for (const contact of allContacts) {
      const key = contact.company!;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(contact);
    }

    return topCompanies.map((tc) => ({
      company: tc.company,
      contactCount: groups.get(tc.company)?.length ?? 0,
      contacts: groups.get(tc.company) ?? [],
    }));
  }

  // --- Contact Health Stats ---

  /** Get contact health stats for the dashboard */
  getContactHealthStats(): ContactHealthStats {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM contacts').get() as { c: number }).c;
    const withEmail = (this.db.prepare('SELECT COUNT(*) as c FROM contacts WHERE email IS NOT NULL AND email != \'\'').get() as { c: number }).c;
    const withCompany = (this.db.prepare('SELECT COUNT(*) as c FROM contacts WHERE company IS NOT NULL AND company != \'\'').get() as { c: number }).c;

    // Contacts that appear on more than one platform (same person_id with multiple contacts)
    const withMultiplePlatforms = (this.db.prepare(`
      SELECT COUNT(*) as c FROM (
        SELECT person_id FROM contacts
        WHERE person_id IS NOT NULL
        GROUP BY person_id
        HAVING COUNT(DISTINCT platform) > 1
      )
    `).get() as { c: number }).c;

    // Profiles detected last 24h (page_visits with site_entity_type like 'profile' or contacts)
    const profilesDetectedLast24h = (this.db.prepare(`
      SELECT COUNT(*) as c FROM page_visits
      WHERE site_entity_type IS NOT NULL
        AND created_at >= datetime('now', '-1 day')
    `).get() as { c: number }).c;

    // Contacts extracted last 24h
    const contactsExtractedLast24h = (this.db.prepare(`
      SELECT COUNT(*) as c FROM contacts
      WHERE first_seen_at >= datetime('now', '-1 day')
    `).get() as { c: number }).c;

    // Emails found last 24h (contacts where email was set and first_seen or last updated in 24h)
    const emailsFoundLast24h = (this.db.prepare(`
      SELECT COUNT(*) as c FROM contacts
      WHERE email IS NOT NULL AND email != ''
        AND first_seen_at >= datetime('now', '-1 day')
    `).get() as { c: number }).c;

    return {
      total,
      withEmail,
      withCompany,
      withMultiplePlatforms,
      profilesDetectedLast24h,
      contactsExtractedLast24h,
      emailsFoundLast24h,
    };
  }

  // --- Export Helpers ---

  /** Export all contacts as CSV */
  exportContactsCSV(): string {
    const contacts = this.db.prepare('SELECT * FROM contacts ORDER BY last_seen_at DESC').all() as ContactRow[];

    const headers = [
      'id', 'person_id', 'name', 'headline', 'company', 'role', 'location', 'bio',
      'email', 'email_source', 'email_confidence', 'phone', 'website',
      'linkedin_url', 'twitter_url', 'github_url', 'instagram_url', 'facebook_url',
      'other_urls', 'profile_image_url', 'tags', 'notes',
      'source_page_url', 'platform', 'first_seen_at', 'last_seen_at', 'times_viewed',
    ];

    const escapeCSV = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = contacts.map((c) =>
      headers.map((h) => escapeCSV((c as unknown as Record<string, unknown>)[h] as string | number | null)).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /** Export all contacts as vCard 3.0 */
  exportContactsVCard(): string {
    const contacts = this.db.prepare('SELECT * FROM contacts ORDER BY last_seen_at DESC').all() as ContactRow[];

    const escapeVCard = (value: string): string => {
      return value
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    const cards = contacts.map((c) => {
      const lines: string[] = [];
      lines.push('BEGIN:VCARD');
      lines.push('VERSION:3.0');

      // Name: try to split into first/last
      const nameParts = c.name.trim().split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts.slice(-1)[0] ?? '' : '';
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] ?? '';
      lines.push(`N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`);
      lines.push(`FN:${escapeVCard(c.name)}`);

      if (c.company) {
        lines.push(`ORG:${escapeVCard(c.company)}`);
      }
      if (c.role) {
        lines.push(`TITLE:${escapeVCard(c.role)}`);
      }
      if (c.email) {
        lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(c.email)}`);
      }
      if (c.phone) {
        lines.push(`TEL;TYPE=WORK:${escapeVCard(c.phone)}`);
      }
      if (c.website) {
        lines.push(`URL:${escapeVCard(c.website)}`);
      }
      if (c.linkedin_url) {
        lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${c.linkedin_url}`);
      }
      if (c.twitter_url) {
        lines.push(`X-SOCIALPROFILE;TYPE=twitter:${c.twitter_url}`);
      }
      if (c.github_url) {
        lines.push(`X-SOCIALPROFILE;TYPE=github:${c.github_url}`);
      }
      if (c.instagram_url) {
        lines.push(`X-SOCIALPROFILE;TYPE=instagram:${c.instagram_url}`);
      }
      if (c.facebook_url) {
        lines.push(`X-SOCIALPROFILE;TYPE=facebook:${c.facebook_url}`);
      }
      if (c.headline) {
        lines.push(`NOTE:${escapeVCard(c.headline)}`);
      }
      if (c.profile_image_url) {
        lines.push(`PHOTO;VALUE=URI:${c.profile_image_url}`);
      }

      lines.push('END:VCARD');
      return lines.join('\r\n');
    });

    return cards.join('\r\n');
  }

  /** Get database stats */
  getStats(): { visits: number; interactions: number; sessions: number; contacts: number; persons: number; dbSizeMB: number } {
    const visits = (this.db.prepare('SELECT COUNT(*) as c FROM page_visits').get() as { c: number }).c;
    const interactions = (this.db.prepare('SELECT COUNT(*) as c FROM interactions').get() as { c: number }).c;
    const sessions = (this.db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }).c;
    const contacts = (this.db.prepare('SELECT COUNT(*) as c FROM contacts').get() as { c: number }).c;
    const persons = (this.db.prepare('SELECT COUNT(*) as c FROM persons').get() as { c: number }).c;
    const dbPath = this.db.name;
    let dbSizeMB = 0;
    try {
      const stat = fs.statSync(dbPath);
      dbSizeMB = Math.round(stat.size / 1024 / 1024 * 100) / 100;
    } catch { /* ok */ }
    return { visits, interactions, sessions, contacts, persons, dbSizeMB };
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
  person_id: number | null;
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

export interface ContactInput {
  name: string;
  headline?: string;
  company?: string;
  role?: string;
  location?: string;
  bio?: string;
  email?: string;
  emailSource?: string;
  emailConfidence?: number;
  website?: string;
  profileUrl: string;
  profileImageUrl?: string;
  platform: 'linkedin' | 'github' | 'twitter' | 'instagram' | 'facebook';
  rawData?: Record<string, unknown>;
}

export interface ContactRow {
  id: number;
  person_id: number | null;
  name: string;
  headline: string | null;
  company: string | null;
  role: string | null;
  location: string | null;
  bio: string | null;
  email: string | null;
  email_source: string | null;
  email_confidence: number;
  phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  other_urls: string | null;
  profile_image_url: string | null;
  tags: string | null;
  notes: string | null;
  source_page_url: string;
  platform: string;
  first_seen_at: string;
  last_seen_at: string;
  times_viewed: number;
  raw_data: string | null;
  connection_degree: string | null;
  mutual_connections: number | null;
  lead_tags: string | null;
  is_premium_data: number;
  source_type: string | null;
  company_visits: number;
  sales_nav_url: string | null;
}

export interface PersonRow {
  id: number;
  uuid: string;
  display_name: string;
  merged_from: string | null;
  created_at: string;
  updated_at: string;
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

export interface TimelineEntry {
  entryType: 'visit' | 'interaction';
  entryId: number;
  url: string;
  title: string | null;
  domain: string | null;
  interactionType: string | null;
  targetText: string | null;
  timeSpentMs: number | null;
  createdAt: string;
}

export interface MergeCandidate {
  contactIdA: number;
  contactIdB: number;
  personIdA: number | null;
  personIdB: number | null;
  nameA: string;
  nameB: string;
  companyA: string;
  companyB: string;
  platformA: string;
  platformB: string;
  confidence: number;
}

export interface RelationshipScore {
  personId: number;
  totalViews: number;
  recencyDays: number | null;
  platformCount: number;
  interactionCount: number;
  score: number;
}

export interface CompanyGroup {
  company: string;
  contactCount: number;
  contacts: ContactRow[];
}

export interface ContactHealthStats {
  total: number;
  withEmail: number;
  withCompany: number;
  withMultiplePlatforms: number;
  profilesDetectedLast24h: number;
  contactsExtractedLast24h: number;
  emailsFoundLast24h: number;
}
