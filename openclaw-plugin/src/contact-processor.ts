import { resolve as dnsResolve } from 'dns/promises';
import type { EventProcessor, PipelineEvent, ContextEvent } from './event-pipeline.js';
import type { ContextDatabase, ContactInput } from './database.js';
import { extractContactFromPage, inferEmail } from './contact-extractor.js';
import { utcTimestamp } from './utc-timestamp.js';

/** Basic email validation: format check + DNS MX record verification */
async function validateEmail(email: string): Promise<boolean> {
  // Format check
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) return false;

  // DNS MX check — verify the domain has mail servers
  const domain = email.split('@')[1];
  if (!domain) return false;
  try {
    const records = await dnsResolve(domain, 'MX');
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}

export class ContactProcessor implements EventProcessor {
  name = 'contact-extraction';
  private database: ContextDatabase;
  private anthropicKey: string;

  constructor(database: ContextDatabase, anthropicKey: string) {
    this.database = database;
    this.anthropicKey = anthropicKey;
  }

  async process(event: PipelineEvent): Promise<void> {
    if (event.type !== 'context_update') return;
    const ctx = event as ContextEvent;

    // Extract contact (or company enrichment) from page
    const result = extractContactFromPage(
      ctx.payload.url,
      ctx.payload.content,
      ctx.payload.title,
      ctx.payload.site_data,
    );

    // Handle company page enrichment (LinkedIn /company/ pages)
    if (result.companyEnrichment) {
      try {
        const enriched = this.database.incrementCompanyVisits(result.companyEnrichment.companyName);
        if (enriched > 0) {
          console.log(`[${utcTimestamp()}] [CONTACT] Company page "${result.companyEnrichment.companyName}" → enriched ${enriched} contacts`);
        }
      } catch (e) {
        console.warn(`[${utcTimestamp()}] [CONTACT] Company enrichment failed:`, e);
      }
    }

    const contact = result.contact;
    if (!contact) return;

    // Upsert contact into DB
    try {
      const contactId = this.database.upsertContact(contact);
      console.log(`[${utcTimestamp()}] [CONTACT] ${contact.email ? '📧' : '👤'} ${contact.name} (${contact.platform}) → id:${contactId}`);

      // Update LinkedIn-specific fields if present in rawData
      if (contact.rawData) {
        this.database.updateContactLinkedInFields(contactId, contact.rawData);
      }

      // Link this page_visit to the contact's person for timeline/scoring
      if (ctx.visitId) {
        const contactRow = this.database.getContact(contactId);
        if (contactRow?.person_id) {
          this.database.setVisitPersonId(ctx.visitId, contactRow.person_id);
        }
      }

      // If contact has company but no email, try AI inference (fire-and-forget — don't block pipeline)
      if (!contact.email && contact.company && this.anthropicKey) {
        inferEmail(contact.name, contact.company, this.anthropicKey).then(async (inferred) => {
          if (!inferred) return;

          // Validate the inferred email before storing — catches LLM hallucinations
          const valid = await validateEmail(inferred.email);
          if (!valid) {
            console.warn(`[${utcTimestamp()}] [CONTACT] Rejected inferred email for ${contact.name}: ${inferred.email} (failed validation)`);
            return;
          }

          this.database.updateContactEmail(contactId, inferred.email, 'ai_inferred', inferred.confidence);
          console.log(`[${utcTimestamp()}] [CONTACT] 🤖 Inferred email for ${contact.name}: ${inferred.email} (${Math.round(inferred.confidence * 100)}%)`);
        }).catch((err) => {
          console.warn(`[${utcTimestamp()}] [CONTACT] Email inference failed for ${contact.name}:`, err);
        });
      }
    } catch (e) {
      console.warn(`[${utcTimestamp()}] [CONTACT] DB upsert failed:`, e);
    }
  }
}
