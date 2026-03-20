/**
 * Contact extractor — detects profile pages and extracts structured contact data.
 *
 * Flow:
 *   Page URL arrives → match against profile patterns → extract fields from content
 *   → scan for emails via regex → upsert into contacts DB
 *
 * Supports: LinkedIn, GitHub, Twitter/X, Instagram
 */

import type { ContactInput } from './database.js';
import { utcTimestamp } from './utc-timestamp.js';
import { extractLinkedInContact, detectLinkedInPageType } from './linkedin-extractor.js';
import type { LinkedInExtractionResult } from './linkedin-extractor.js';

// --- Content size limit ---

const MAX_CONTENT_LENGTH = 50_000;

// --- Profile URL patterns ---

interface ProfilePattern {
  platform: 'linkedin' | 'github' | 'twitter' | 'instagram' | 'facebook';
  pattern: RegExp;
  extractUsername: (url: string) => string | null;
}

const PROFILE_PATTERNS: ProfilePattern[] = [
  {
    platform: 'linkedin',
    pattern: /linkedin\.com\/in\/([^/?#]+)/,
    extractUsername: (url) => url.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1] ?? null,
  },
  {
    platform: 'github',
    pattern: /github\.com\/([a-zA-Z0-9-]+)\/?(?:[?#]|$)/,
    extractUsername: (url) => {
      const match = url.match(/github\.com\/([a-zA-Z0-9-]+)\/?(?:[?#]|$)/);
      if (!match) return null;
      const username = match[1]!;
      // Exclude org pages, settings, etc.
      const reserved = ['settings', 'organizations', 'explore', 'topics', 'trending', 'collections', 'events', 'sponsors', 'features', 'security', 'pulls', 'issues', 'marketplace', 'notifications'];
      return reserved.includes(username) ? null : username;
    },
  },
  {
    platform: 'twitter',
    pattern: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/?(?:[?#]|$)/,
    extractUsername: (url) => {
      const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/?(?:[?#]|$)/);
      if (!match) return null;
      const username = match[1]!;
      const reserved = ['home', 'explore', 'notifications', 'messages', 'settings', 'search', 'compose', 'i', 'login'];
      return reserved.includes(username) ? null : username;
    },
  },
  {
    platform: 'instagram',
    pattern: /instagram\.com\/([a-zA-Z0-9_.]+)\/?(?:[?#]|$)/,
    extractUsername: (url) => {
      const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?(?:[?#]|$)/);
      if (!match) return null;
      const username = match[1]!;
      const reserved = ['explore', 'reels', 'stories', 'direct', 'accounts', 'p'];
      return reserved.includes(username) ? null : username;
    },
  },
];

// --- Email extraction ---

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const BLOCKED_EMAIL_DOMAINS = new Set([
  'linkedin.com', 'github.com', 'twitter.com', 'x.com', 'instagram.com',
  'facebook.com', 'google.com', 'apple.com', 'microsoft.com',
  'notifications.github.com', 'noreply.github.com',
  'sentry.io', 'example.com', 'test.com', 'localhost',
]);

const BLOCKED_EMAIL_PREFIXES = new Set([
  'support', 'info', 'admin', 'noreply', 'no-reply', 'help',
  'contact', 'sales', 'marketing', 'team', 'hello', 'feedback',
  'abuse', 'postmaster', 'webmaster', 'mailer-daemon',
]);

const BLOCKED_EMAIL_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'css', 'js', 'ts',
  'woff', 'woff2', 'ttf', 'eot', 'ico', 'webp',
]);

/** Extract personal emails from text, filtering out noise */
export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? [];
  const unique = new Set<string>();

  for (const email of matches) {
    const lower = email.toLowerCase();
    const [prefix, domain] = lower.split('@');
    if (!prefix || !domain) continue;

    // Filter out file extensions masquerading as emails
    const tld = domain.split('.').pop() ?? '';
    if (BLOCKED_EMAIL_EXTENSIONS.has(tld)) continue;

    // Filter out platform/service emails
    if (BLOCKED_EMAIL_DOMAINS.has(domain)) continue;

    // Filter out generic addresses
    if (BLOCKED_EMAIL_PREFIXES.has(prefix)) continue;

    unique.add(lower);
  }

  return Array.from(unique);
}

// --- Profile field extraction from page content ---

interface ExtractedProfile {
  name: string;
  headline?: string;
  company?: string;
  role?: string;
  location?: string;
  bio?: string;
  website?: string;
  email?: string;
  profileImageUrl?: string;
}

/** Extract profile fields from page content based on platform */
function extractProfileFields(content: string, platform: string, title: string): ExtractedProfile {
  // Start with the page title as the name (common pattern: "Name | Platform")
  let name = title
    .replace(/\s*[|–—-]\s*(LinkedIn|GitHub|Twitter|X|Instagram|Facebook).*$/i, '')
    .replace(/\s*\(.*?\)\s*$/, '')
    .trim();

  // Platform-specific extraction
  const profile: ExtractedProfile = { name };

  if (platform === 'linkedin') {
    // LinkedIn: "Name - Role - Company | LinkedIn"
    const titleMatch = title.match(/^(.+?)\s*[-–—]\s*(.+?)\s*[-–—]\s*(.+?)\s*\|/);
    if (titleMatch) {
      profile.name = titleMatch[1]!.trim();
      profile.role = titleMatch[2]!.trim();
      profile.company = titleMatch[3]!.trim();
    }

    // Extract headline from content (usually near the top)
    const headlineMatch = content.match(/(?:^|\n)([^\n]{10,100}(?:at|@|Engineer|Manager|Director|CEO|CTO|Founder|Developer|Designer|Consultant)[^\n]*)/i);
    if (headlineMatch) {
      profile.headline = headlineMatch[1]!.trim().slice(0, 200);
    }

    // Location
    const locationMatch = content.match(/(?:Greater |)([\w\s]+(?:Area|City|Metro|County|Region)[\w\s,]*)/);
    if (locationMatch) {
      profile.location = locationMatch[1]!.trim().slice(0, 100);
    }
  }

  if (platform === 'github') {
    // GitHub bio is usually in an element with specific structure
    const bioMatch = content.match(/(?:^|\n)([^\n]{20,300})\n/);
    if (bioMatch) {
      profile.bio = bioMatch[1]!.trim();
    }
  }

  // Extract website from content (look for http links that aren't the platform itself)
  const urlMatch = content.match(/https?:\/\/(?!(?:www\.)?(?:linkedin|github|twitter|x|instagram|facebook)\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s)>"]*/);
  if (urlMatch) {
    profile.website = urlMatch[0];
  }

  // Extract emails from content
  const emails = extractEmails(content);
  if (emails.length > 0) {
    profile.email = emails[0];
  }

  return profile;
}

// --- Site data platform detection ---

/** Known site names per platform — used for siteData-based detection */
const SITE_NAME_TO_PLATFORM = new Map<string, 'linkedin' | 'github' | 'twitter' | 'instagram' | 'facebook'>([
  ['linkedin', 'linkedin'],
  ['github', 'github'],
  ['twitter', 'twitter'],
  ['x', 'twitter'],
  ['x.com', 'twitter'],
  ['instagram', 'instagram'],
  ['facebook', 'facebook'],
  ['meta', 'facebook'],
]);

/** Detect platform from structured site data (e.g., from JSON-LD or meta tags) */
export function detectPlatformFromSiteData(
  siteData: { siteName: string; entityType: string } | null,
): 'linkedin' | 'github' | 'twitter' | 'instagram' | 'facebook' | null {
  if (!siteData) return null;

  const name = siteData.siteName.toLowerCase().trim();
  return SITE_NAME_TO_PLATFORM.get(name) ?? null;
}

// --- Build ContactInput from extracted fields ---

function buildContactInput(
  fields: ExtractedProfile,
  platform: ContactInput['platform'],
  url: string,
  username: string,
): ContactInput {
  return {
    name: fields.name,
    headline: fields.headline,
    company: fields.company,
    role: fields.role,
    location: fields.location,
    bio: fields.bio,
    email: fields.email,
    emailSource: fields.email ? 'page_visible' : undefined,
    emailConfidence: fields.email ? 0.7 : 0,
    website: fields.website,
    profileUrl: url,
    profileImageUrl: fields.profileImageUrl,
    platform,
    rawData: { username, ...fields },
  };
}

// --- Unified extraction entry point ---

export interface ExtractionResult {
  contact: ContactInput | null;
  companyEnrichment: { companyName: string; companyUrl: string } | null;
}

/** Extract contact from a page using platform-specific extractors */
export function extractContactFromPage(
  url: string,
  content: string,
  title: string,
  siteData: { siteName: string; entityType: string; data: Record<string, unknown> } | null,
): ExtractionResult {
  // --- LinkedIn: delegate to specialized extractor ---
  const linkedInPage = detectLinkedInPageType(url);
  const siteDataPlatform = detectPlatformFromSiteData(siteData);

  if (linkedInPage || siteDataPlatform === 'linkedin') {
    const result = extractLinkedInContact(url, content, title);
    return { contact: result.contact, companyEnrichment: result.companyEnrichment };
  }

  // --- Other platforms: generic extraction ---
  const safeContent = content.length > MAX_CONTENT_LENGTH ? content.slice(0, MAX_CONTENT_LENGTH) : content;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { contact: null, companyEnrichment: null };
  }

  // Try siteData-based platform detection first
  if (siteDataPlatform) {
    let username: string | null = null;
    for (const pattern of PROFILE_PATTERNS) {
      if (pattern.platform === siteDataPlatform) {
        username = pattern.extractUsername(parsedUrl.href);
        break;
      }
    }
    if (!username) return { contact: null, companyEnrichment: null };

    const fields = extractProfileFields(safeContent, siteDataPlatform, title);
    if (!fields.name || fields.name.length < 2) return { contact: null, companyEnrichment: null };

    console.log(`[${utcTimestamp()}] [CONTACT] Detected ${siteDataPlatform} profile (via siteData): ${fields.name} (@${username})`);
    return { contact: buildContactInput(fields, siteDataPlatform, url, username), companyEnrichment: null };
  }

  // Fall back to URL-based detection
  for (const pattern of PROFILE_PATTERNS) {
    const username = pattern.extractUsername(parsedUrl.href);
    if (!username) continue;

    const fields = extractProfileFields(safeContent, pattern.platform, title);
    if (!fields.name || fields.name.length < 2) continue;

    console.log(`[${utcTimestamp()}] [CONTACT] Detected ${pattern.platform} profile: ${fields.name} (@${username})`);
    return { contact: buildContactInput(fields, pattern.platform, url, username), companyEnrichment: null };
  }

  return { contact: null, companyEnrichment: null };
}

// --- Main extraction function (backward compat) ---

/** Check if a URL is a profile page and extract contact data (backward compat) */
export function detectAndExtractProfile(
  url: string,
  content: string,
  title: string,
): ContactInput | null {
  return extractContactFromPage(url, content, title, null).contact;
}

/** Called by ContactProcessor when a contact has company but no email */
export async function inferEmail(
  name: string,
  company: string | null,
  apiKey: string,
): Promise<{ email: string; confidence: number } | null> {
  if (!apiKey || !company) return null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20241022',
        max_tokens: 100,
        system: 'You are an email pattern expert. Given a person\'s name and company, suggest their most likely work email address. Respond with ONLY the email address and a confidence percentage (0-100). Format: email@domain.com (85%)',
        messages: [{ role: 'user', content: `Name: ${name}\nCompany: ${company}` }],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json() as { content: Array<{ text: string }> };
    const text = data.content?.[0]?.text ?? '';

    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const confMatch = text.match(/(\d{1,3})%/);

    if (emailMatch) {
      const confidence = confMatch ? parseInt(confMatch[1]!, 10) / 100 : 0.5;
      return { email: emailMatch[1]!, confidence };
    }
  } catch {
    // Claude API failed — not critical
  }

  return null;
}
