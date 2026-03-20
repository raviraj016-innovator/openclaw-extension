import { describe, it, expect, vi } from 'vitest';
import { extractEmails, detectAndExtractProfile, detectPlatformFromSiteData, extractContactFromPage } from '../src/contact-extractor.js';

describe('extractEmails', () => {
  it('extracts valid emails from text', () => {
    const text = 'Contact me at john@example.org or jane.doe@company.com for info';
    const emails = extractEmails(text);
    expect(emails).toContain('john@example.org');
    expect(emails).toContain('jane.doe@company.com');
  });

  it('filters out image filenames', () => {
    const text = 'avatar@2x.png logo@brand.svg icon@retina.jpg';
    expect(extractEmails(text)).toHaveLength(0);
  });

  it('filters out platform notification emails', () => {
    const text = 'notifications@github.com noreply@linkedin.com';
    expect(extractEmails(text)).toHaveLength(0);
  });

  it('filters out generic addresses', () => {
    const text = 'support@company.com info@startup.io admin@corp.org';
    expect(extractEmails(text)).toHaveLength(0);
  });

  it('deduplicates emails', () => {
    const text = 'john@test.org and again john@test.org';
    expect(extractEmails(text)).toHaveLength(1);
  });

  it('handles text with no emails', () => {
    expect(extractEmails('No emails here')).toHaveLength(0);
  });

  it('handles empty text', () => {
    expect(extractEmails('')).toHaveLength(0);
  });

  it('extracts email from bio with mixed content', () => {
    const text = 'Software engineer. Reach me at alex@startupco.io. Based in SF.';
    const emails = extractEmails(text);
    expect(emails).toContain('alex@startupco.io');
  });
});

describe('detectAndExtractProfile', () => {
  // --- LinkedIn ---
  it('detects LinkedIn profile URLs', () => {
    const result = detectAndExtractProfile(
      'https://www.linkedin.com/in/john-smith-123',
      'John Smith Senior Engineer at Anthropic San Francisco',
      'John Smith - Senior Engineer - Anthropic | LinkedIn',
    );
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('linkedin');
    expect(result!.name).toBe('John Smith');
    expect(result!.role).toBe('Senior Engineer');
    expect(result!.company).toBe('Anthropic');
  });

  it('ignores LinkedIn non-profile pages', () => {
    expect(detectAndExtractProfile(
      'https://www.linkedin.com/feed/',
      'Feed content',
      'Feed | LinkedIn',
    )).toBeNull();
  });

  // --- GitHub ---
  it('detects GitHub profile URLs', () => {
    const result = detectAndExtractProfile(
      'https://github.com/johndoe',
      'Full-stack developer. Building cool stuff. johndoe@gmail.com',
      'johndoe (John Doe)',
    );
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('github');
    expect(result!.email).toBe('johndoe@gmail.com');
  });

  it('ignores GitHub reserved pages', () => {
    expect(detectAndExtractProfile('https://github.com/explore', '', 'Explore')).toBeNull();
    expect(detectAndExtractProfile('https://github.com/settings', '', 'Settings')).toBeNull();
  });

  // --- Twitter ---
  it('detects Twitter profile URLs', () => {
    const result = detectAndExtractProfile(
      'https://x.com/elonmusk',
      'CEO of Tesla and SpaceX',
      'Elon Musk (@elonmusk) / X',
    );
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('twitter');
  });

  it('ignores Twitter reserved pages', () => {
    expect(detectAndExtractProfile('https://x.com/home', '', 'Home')).toBeNull();
    expect(detectAndExtractProfile('https://x.com/explore', '', 'Explore')).toBeNull();
  });

  // --- Instagram ---
  it('detects Instagram profile URLs', () => {
    const result = detectAndExtractProfile(
      'https://www.instagram.com/natgeo',
      'National Geographic Experience the world',
      'National Geographic (@natgeo)',
    );
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('instagram');
  });

  // --- Non-profile pages ---
  it('returns null for non-profile URLs', () => {
    expect(detectAndExtractProfile('https://google.com', '', 'Google')).toBeNull();
    expect(detectAndExtractProfile('https://claw.raviraj.lol/', '', 'Dashboard')).toBeNull();
  });

  // --- Edge cases ---
  it('handles GitHub user with repo path (not a profile)', () => {
    expect(detectAndExtractProfile(
      'https://github.com/johndoe/my-repo',
      'Repository content',
      'johndoe/my-repo',
    )).toBeNull();
  });

  // --- Query parameter handling ---
  it('detects GitHub profiles with query params', () => {
    const result = detectAndExtractProfile(
      'https://github.com/johndoe?tab=repositories',
      'Full-stack developer. Building cool stuff.',
      'johndoe (John Doe)',
    );
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('github');
  });

  it('detects Twitter profiles with query params', () => {
    const result = detectAndExtractProfile(
      'https://x.com/elonmusk?s=20',
      'CEO of Tesla and SpaceX',
      'Elon Musk (@elonmusk) / X',
    );
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('twitter');
  });
});

describe('detectPlatformFromSiteData', () => {
  it('detects LinkedIn', () => {
    expect(detectPlatformFromSiteData({ siteName: 'LinkedIn', entityType: 'profile' })).toBe('linkedin');
  });

  it('detects GitHub', () => {
    expect(detectPlatformFromSiteData({ siteName: 'GitHub', entityType: 'profile' })).toBe('github');
  });

  it('detects X/Twitter', () => {
    expect(detectPlatformFromSiteData({ siteName: 'X', entityType: 'profile' })).toBe('twitter');
    expect(detectPlatformFromSiteData({ siteName: 'Twitter', entityType: 'profile' })).toBe('twitter');
    expect(detectPlatformFromSiteData({ siteName: 'X.com', entityType: 'profile' })).toBe('twitter');
  });

  it('returns null for unknown sites', () => {
    expect(detectPlatformFromSiteData({ siteName: 'Xero', entityType: 'app' })).toBeNull();
    expect(detectPlatformFromSiteData({ siteName: 'Flexport', entityType: 'app' })).toBeNull();
    expect(detectPlatformFromSiteData({ siteName: 'PixelArt', entityType: 'page' })).toBeNull();
  });

  it('returns null for null siteData', () => {
    expect(detectPlatformFromSiteData(null)).toBeNull();
  });
});

describe('extractContactFromPage — siteData path', () => {
  it('extracts contact using siteData platform detection', () => {
    const { contact } = extractContactFromPage(
      'https://github.com/johndoe',
      'Full-stack developer. Building cool stuff. johndoe@gmail.com',
      'johndoe (John Doe)',
      { siteName: 'GitHub', entityType: 'profile', data: {} },
    );
    expect(contact).not.toBeNull();
    expect(contact!.platform).toBe('github');
    expect(contact!.email).toBe('johndoe@gmail.com');
  });

  it('falls back to URL detection when siteData is null', () => {
    const { contact } = extractContactFromPage(
      'https://github.com/johndoe',
      'Full-stack developer. Building cool stuff.',
      'johndoe (John Doe)',
      null,
    );
    expect(contact).not.toBeNull();
    expect(contact!.platform).toBe('github');
  });

  it('returns null contact when siteData platform has no matching URL pattern', () => {
    const { contact } = extractContactFromPage(
      'https://randomsite.com/johndoe',
      'Some content',
      'John Doe',
      { siteName: 'GitHub', entityType: 'profile', data: {} },
    );
    expect(contact).toBeNull();
  });

  it('truncates content at 50KB', () => {
    const longContent = 'A'.repeat(100_000) + ' johndoe@gmail.com';
    const { contact } = extractContactFromPage(
      'https://github.com/johndoe',
      longContent,
      'johndoe (John Doe)',
      null,
    );
    // The email is past 50KB so should not be extracted
    expect(contact).not.toBeNull();
    expect(contact!.email).toBeUndefined();
  });
});
