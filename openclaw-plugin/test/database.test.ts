import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextDatabase } from '../src/database.js';
import type { ContactInput } from '../src/database.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const makeContact = (overrides: Partial<ContactInput> = {}): ContactInput => ({
  name: 'John Smith',
  headline: 'Software Engineer',
  company: 'Acme Inc',
  role: 'Senior Engineer',
  location: 'San Francisco',
  profileUrl: 'https://www.linkedin.com/in/john-smith',
  platform: 'linkedin',
  ...overrides,
});

describe('ContextDatabase — Contacts/Persons', () => {
  let db: ContextDatabase;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'openclaw-db-test-'));
    db = new ContextDatabase(path.join(tmpDir, 'test.db'));
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- Contact CRUD ---

  describe('Contact CRUD', () => {
    it('upserts new contact correctly', () => {
      const input = makeContact();
      const id = db.upsertContact(input);

      expect(id).toBeGreaterThan(0);

      const contact = db.getContact(id);
      expect(contact).toBeDefined();
      expect(contact!.name).toBe('John Smith');
      expect(contact!.headline).toBe('Software Engineer');
      expect(contact!.company).toBe('Acme Inc');
      expect(contact!.role).toBe('Senior Engineer');
      expect(contact!.location).toBe('San Francisco');
      expect(contact!.linkedin_url).toBe('https://www.linkedin.com/in/john-smith');
      expect(contact!.platform).toBe('linkedin');
      expect(contact!.times_viewed).toBe(1);
      expect(contact!.source_page_url).toBe('https://www.linkedin.com/in/john-smith');
    });

    it('updates existing contact on re-visit', () => {
      const id1 = db.upsertContact(makeContact());
      const id2 = db.upsertContact(makeContact({
        headline: 'Staff Engineer',
        company: 'Acme Corp',
      }));

      expect(id2).toBe(id1);

      const contact = db.getContact(id1);
      expect(contact).toBeDefined();
      expect(contact!.headline).toBe('Staff Engineer');
      expect(contact!.company).toBe('Acme Corp');
    });

    it('increments times_viewed on re-visit', () => {
      const id = db.upsertContact(makeContact());
      db.upsertContact(makeContact());

      const contact = db.getContact(id);
      expect(contact).toBeDefined();
      expect(contact!.times_viewed).toBe(2);
    });

    it('preserves higher email_confidence on update', () => {
      const id = db.upsertContact(makeContact({
        email: 'john@acme.com',
        emailSource: 'pattern',
        emailConfidence: 0.7,
      }));

      // Update with lower confidence — should keep 0.7
      db.upsertContact(makeContact({
        email: 'john@acme.com',
        emailSource: 'guess',
        emailConfidence: 0.5,
      }));

      const contact = db.getContact(id);
      expect(contact).toBeDefined();
      expect(contact!.email_confidence).toBe(0.7);
    });

    it('validates platform column name against allowlist', () => {
      expect(() =>
        db.upsertContact(makeContact({
          platform: 'invalid' as ContactInput['platform'],
          profileUrl: 'https://invalid.com/profile',
        }))
      ).toThrow(/Invalid platform URL column/);
    });
  });

  // --- Person Identity ---

  describe('Person identity', () => {
    it('auto-creates person on contact insert', () => {
      const id = db.upsertContact(makeContact());
      const contact = db.getContact(id);

      expect(contact).toBeDefined();
      expect(contact!.person_id).not.toBeNull();
      expect(contact!.person_id).toBeGreaterThan(0);
    });

    it('getPersonContacts returns linked contacts', () => {
      const id = db.upsertContact(makeContact());
      const contact = db.getContact(id)!;
      const personContacts = db.getPersonContacts(contact.person_id!);

      expect(personContacts).toHaveLength(1);
      expect(personContacts[0].id).toBe(id);
      expect(personContacts[0].name).toBe('John Smith');
    });

    it('createPersonForContact links contact to person', () => {
      // Insert a contact — it will auto-create a person
      const id = db.upsertContact(makeContact());
      const contact = db.getContact(id)!;
      const originalPersonId = contact.person_id!;

      // Create a second person for the same contact (manually)
      const newPersonId = db.createPersonForContact(id);

      expect(newPersonId).toBeGreaterThan(0);
      expect(newPersonId).not.toBe(originalPersonId);

      // The contact should now be linked to the new person
      const updated = db.getContact(id)!;
      expect(updated.person_id).toBe(newPersonId);
    });
  });

  // --- Search ---

  describe('Search', () => {
    it('searchContacts finds by name', () => {
      db.upsertContact(makeContact({ name: 'Alice Wonderland' }));
      db.upsertContact(makeContact({
        name: 'Bob Builder',
        profileUrl: 'https://www.linkedin.com/in/bob-builder',
      }));

      const results = db.searchContacts('Alice');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((c) => c.name === 'Alice Wonderland')).toBe(true);
    });

    it('searchContacts finds by company', () => {
      db.upsertContact(makeContact({ company: 'SpecialCorp' }));
      db.upsertContact(makeContact({
        name: 'Jane Doe',
        company: 'OtherCo',
        profileUrl: 'https://www.linkedin.com/in/jane-doe',
      }));

      const results = db.searchContacts('SpecialCorp');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((c) => c.company === 'SpecialCorp')).toBe(true);
    });

    it('searchContacts returns empty for no match', () => {
      db.upsertContact(makeContact());
      const results = db.searchContacts('zzz_nonexistent_zzz');
      expect(results).toHaveLength(0);
    });
  });

  // --- Deletion ---

  describe('Deletion', () => {
    it('deleteContact removes contact', () => {
      const id = db.upsertContact(makeContact());
      expect(db.getContact(id)).toBeDefined();

      const deleted = db.deleteContact(id);
      expect(deleted).toBe(true);
      expect(db.getContact(id)).toBeUndefined();
    });

    it('deleteContact returns false for non-existent id', () => {
      const deleted = db.deleteContact(99999);
      expect(deleted).toBe(false);
    });
  });

  // --- Merge ---

  describe('Merge', () => {
    it('findMergeCandidates detects same-name contacts', () => {
      db.upsertContact(makeContact({
        name: 'Merge Target',
        company: 'MergeCo',
        platform: 'linkedin',
        profileUrl: 'https://www.linkedin.com/in/merge-target',
      }));

      db.upsertContact(makeContact({
        name: 'Merge Target',
        company: 'MergeCo',
        platform: 'github',
        profileUrl: 'https://github.com/merge-target',
      }));

      const candidates = db.findMergeCandidates();
      expect(candidates.length).toBeGreaterThanOrEqual(1);

      const match = candidates.find(
        (c) => c.nameA === 'Merge Target' && c.nameB === 'Merge Target'
      );
      expect(match).toBeDefined();
      expect(match!.companyA).toBe('MergeCo');
      expect(match!.companyB).toBe('MergeCo');
      // Different platforms should give high confidence
      expect(match!.confidence).toBeCloseTo(0.9, 1);
    });

    it('mergePersons reassigns contacts', () => {
      const idA = db.upsertContact(makeContact({
        name: 'Person A',
        company: 'CompanyA',
        platform: 'linkedin',
        profileUrl: 'https://www.linkedin.com/in/person-a',
      }));

      const idB = db.upsertContact(makeContact({
        name: 'Person B',
        company: 'CompanyB',
        platform: 'github',
        profileUrl: 'https://github.com/person-b',
      }));

      const contactA = db.getContact(idA)!;
      const contactB = db.getContact(idB)!;
      const keepId = contactA.person_id!;
      const mergeId = contactB.person_id!;

      db.mergePersons(keepId, mergeId);

      // Both contacts should now be linked to keepId
      const updatedA = db.getContact(idA)!;
      const updatedB = db.getContact(idB)!;
      expect(updatedA.person_id).toBe(keepId);
      expect(updatedB.person_id).toBe(keepId);

      // The merged person's contacts should include both
      const personContacts = db.getPersonContacts(keepId);
      expect(personContacts).toHaveLength(2);
    });
  });

  // --- Relationship Scoring ---

  describe('Relationship scoring', () => {
    it('getRelationshipScore returns score for person', () => {
      const id = db.upsertContact(makeContact());
      const contact = db.getContact(id)!;
      const score = db.getRelationshipScore(contact.person_id!);

      expect(score).toBeDefined();
      expect(score.personId).toBe(contact.person_id!);
      expect(score.totalViews).toBe(1);
      expect(score.platformCount).toBe(1);
      expect(score.interactionCount).toBe(0);
      expect(typeof score.score).toBe('number');
      expect(score.score).toBeGreaterThan(0);
      expect(typeof score.recencyDays).toBe('number');
    });

    it('getRelationshipScore accounts for times_viewed', () => {
      const id = db.upsertContact(makeContact());
      const contact = db.getContact(id)!;
      const scoreBefore = db.getRelationshipScore(contact.person_id!);

      // Re-visit several times to increase times_viewed
      db.upsertContact(makeContact());
      db.upsertContact(makeContact());
      db.upsertContact(makeContact());

      const scoreAfter = db.getRelationshipScore(contact.person_id!);

      expect(scoreAfter.totalViews).toBe(4);
      expect(scoreAfter.score).toBeGreaterThan(scoreBefore.score);
    });
  });

  // --- Company Grouping ---

  describe('Company grouping', () => {
    it('getContactsByCompany groups correctly', () => {
      db.upsertContact(makeContact({
        name: 'Alice',
        company: 'AlphaCo',
        profileUrl: 'https://www.linkedin.com/in/alice',
      }));

      db.upsertContact(makeContact({
        name: 'Bob',
        company: 'AlphaCo',
        profileUrl: 'https://www.linkedin.com/in/bob',
      }));

      db.upsertContact(makeContact({
        name: 'Charlie',
        company: 'BetaCo',
        profileUrl: 'https://www.linkedin.com/in/charlie',
      }));

      const groups = db.getContactsByCompany();
      expect(groups.length).toBeGreaterThanOrEqual(2);

      const alphaGroup = groups.find((g) => g.company === 'AlphaCo');
      expect(alphaGroup).toBeDefined();
      expect(alphaGroup!.contactCount).toBe(2);
      expect(alphaGroup!.contacts).toHaveLength(2);

      const betaGroup = groups.find((g) => g.company === 'BetaCo');
      expect(betaGroup).toBeDefined();
      expect(betaGroup!.contactCount).toBe(1);
      expect(betaGroup!.contacts).toHaveLength(1);
    });
  });

  // --- Health Stats ---

  describe('Health stats', () => {
    it('getContactHealthStats returns correct counts', () => {
      db.upsertContact(makeContact({
        name: 'With Email',
        email: 'test@example.com',
        company: 'StatsCo',
        profileUrl: 'https://www.linkedin.com/in/with-email',
      }));

      db.upsertContact(makeContact({
        name: 'No Email',
        company: 'StatsCo',
        profileUrl: 'https://www.linkedin.com/in/no-email',
      }));

      db.upsertContact(makeContact({
        name: 'No Company',
        company: undefined,
        profileUrl: 'https://www.linkedin.com/in/no-company',
      }));

      const stats = db.getContactHealthStats();

      expect(stats.total).toBe(3);
      expect(stats.withEmail).toBe(1);
      expect(stats.withCompany).toBe(2);
      expect(typeof stats.withMultiplePlatforms).toBe('number');
      expect(typeof stats.profilesDetectedLast24h).toBe('number');
      expect(typeof stats.contactsExtractedLast24h).toBe('number');
      expect(typeof stats.emailsFoundLast24h).toBe('number');
    });
  });

  // --- Export ---

  describe('Export', () => {
    it('exportContactsCSV produces valid CSV', () => {
      db.upsertContact(makeContact({
        name: 'CSV User One',
        email: 'csv1@example.com',
        profileUrl: 'https://www.linkedin.com/in/csv-one',
      }));

      db.upsertContact(makeContact({
        name: 'CSV User Two',
        email: 'csv2@example.com',
        profileUrl: 'https://www.linkedin.com/in/csv-two',
      }));

      const csv = db.exportContactsCSV();
      const lines = csv.split('\n');

      // Header row
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
      expect(lines[0]).toContain('email');
      expect(lines[0]).toContain('company');
      expect(lines[0]).toContain('platform');

      // Data rows
      expect(lines.length).toBe(3); // header + 2 contacts
      expect(csv).toContain('CSV User One');
      expect(csv).toContain('CSV User Two');
      expect(csv).toContain('csv1@example.com');
      expect(csv).toContain('csv2@example.com');
    });

    it('exportContactsVCard produces valid vCard', () => {
      db.upsertContact(makeContact({
        name: 'VCard User',
        email: 'vcard@example.com',
        company: 'VCardCo',
        role: 'Engineer',
        profileUrl: 'https://www.linkedin.com/in/vcard-user',
      }));

      db.upsertContact(makeContact({
        name: 'VCard User Two',
        profileUrl: 'https://www.linkedin.com/in/vcard-two',
      }));

      const vcard = db.exportContactsVCard();

      // Should contain BEGIN:VCARD markers
      expect(vcard).toContain('BEGIN:VCARD');
      expect(vcard).toContain('END:VCARD');
      expect(vcard).toContain('VERSION:3.0');

      // Should contain contact data
      expect(vcard).toContain('FN:VCard User');
      expect(vcard).toContain('EMAIL;TYPE=INTERNET:vcard@example.com');
      expect(vcard).toContain('ORG:VCardCo');
      expect(vcard).toContain('TITLE:Engineer');

      // Should have two vCards
      const beginCount = (vcard.match(/BEGIN:VCARD/g) || []).length;
      expect(beginCount).toBe(2);
    });
  });
});
