/**
 * Chat handler — answers questions about browsing context using Claude.
 *
 * Reads browsing history from SQLite, builds a prompt with context,
 * sends to Anthropic API, streams response back.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { ContextDatabase } from './database.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = process.env['ANTHROPIC_MODEL'] || 'claude-3-haiku-20240307';

export class ChatHandler {
  private database: ContextDatabase;
  private apiKey: string;

  constructor(database: ContextDatabase, apiKey: string) {
    this.database = database;
    this.apiKey = apiKey;
  }

  async handleChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Parse request body
    const body = await this.readBody(req);
    let parsed: { message: string; minutes?: number };
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    if (!parsed.message) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Message required' }));
      return;
    }

    const minutes = parsed.minutes ?? 15;

    // Build context from SQLite
    const context = this.database.buildLLMContext(minutes);
    const browsingStats = this.database.getStats();

    // Query the contact database
    const contacts = this.database.getAllContacts(20);
    const contactStats = this.database.getContactStats();
    const companies = this.database.getContactsByCompany(10);

    // Build contact context section
    const contactContext = this.buildContactContext(contacts, contactStats, companies);

    // Build prompt
    const systemPrompt = `You are an AI assistant that helps users understand their browsing activity and manage their professional network. You have access to their recent browser context and contact database captured by the OpenClaw browser extension.

Here is their browsing context:

${context}

Database stats: ${browsingStats.visits} total page visits, ${browsingStats.interactions} total interactions, ${browsingStats.dbSizeMB}MB database.

${contactContext}

Answer the user's question based on this context. Be specific — reference actual pages, URLs, times, and interactions you can see in the data. When answering questions about contacts or people, use the contact database information. If the context doesn't contain enough information to answer, say so honestly.`;

    if (!this.apiKey || this.apiKey === 'skip') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        response: `I can see your browsing context but the Anthropic API key is not configured, so I can't generate AI responses.\n\nHere's your raw context:\n\n${context}\n\n${contactContext}`,
      }));
      return;
    }

    // Call Claude API
    try {
      const claudeRes = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: parsed.message }],
        }),
      });

      if (!claudeRes.ok) {
        const errText = await claudeRes.text();
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Claude API error: ${claudeRes.status}`, detail: errText }));
        return;
      }

      const data = await claudeRes.json() as { content: Array<{ text: string }> };
      const responseText = data.content?.[0]?.text ?? 'No response from Claude';

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response: responseText }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Failed to call Claude: ${e instanceof Error ? e.message : String(e)}` }));
    }
  }

  private buildContactContext(
    contacts: Array<{ name: string; company?: string | null; email?: string | null; platform: string; times_viewed: number; last_seen_at: string }>,
    stats: { total: number; withEmail: number; platforms: Record<string, number> },
    companies: Array<{ company: string; contacts: Array<{ name: string }> }>,
  ): string {
    const parts: string[] = ['Contact Database:'];

    parts.push(`${stats.total} total contacts, ${stats.withEmail} with email.`);
    parts.push(`Platforms: ${JSON.stringify(stats.platforms)}`);

    if (contacts.length > 0) {
      parts.push('');
      parts.push('Recent contacts:');
      parts.push(contacts.map(c =>
        `- ${c.name}${c.company ? ` @ ${c.company}` : ''}${c.email ? ` (${c.email})` : ''} [${c.platform}] seen ${c.times_viewed}x, last: ${c.last_seen_at}`
      ).join('\n'));
    }

    if (companies.length > 0) {
      parts.push('');
      parts.push('Companies:');
      parts.push(companies.map(g =>
        `- ${g.company} (${g.contacts.length} contacts): ${g.contacts.map(c => c.name).join(', ')}`
      ).join('\n'));
    }

    return parts.join('\n');
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }
}
