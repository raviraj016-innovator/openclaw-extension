/**
 * LinkedIn platform extractor — handles all LinkedIn URL patterns.
 *
 * URL patterns:
 *   /in/username           → Standard profile (existing)
 *   /sales/lead/ID         → Sales Navigator lead profile
 *   /sales/people/ID       → Sales Navigator people view
 *   /company/name          → Company page (enriches contacts, not a contact itself)
 *
 * Sales Navigator dedup:
 *   Sales Nav pages contain a link to the person's standard /in/ profile.
 *   We extract that link and cross-validate it against the page title name
 *   to avoid matching the wrong person. The /in/ URL becomes the canonical
 *   linkedin_url for dedup.
 *
 *   Sales Nav URL ──▶ Extract all /in/ links from content
 *                         │
 *                    Cross-validate against title name
 *                         │
 *                    ├── Match ──▶ Use /in/ URL as profileUrl
 *                    └── No match ──▶ return null (safe skip)
 */

import type { ContactInput } from './database.js';
import { utcTimestamp } from './utc-timestamp.js';

// --- Constants ---

const MAX_CONTENT_LENGTH = 50_000;

// --- Types ---

export type LinkedInPageType = 'standard_profile' | 'sales_nav_lead' | 'sales_nav_people' | 'company_page';

export interface LinkedInExtractionResult {
  contact: ContactInput | null;
  companyEnrichment: { companyName: string; companyUrl: string } | null;
  pageType: LinkedInPageType;
}

interface LinkedInProfileFields {
  name: string;
  headline?: string;
  company?: string;
  role?: string;
  location?: string;
  bio?: string;
  email?: string;
  website?: string;
  connectionDegree?: string;      // "1st", "2nd", "3rd+"
  mutualConnections?: number;
  leadTags?: string[];
  isPremiumData: boolean;
  sourceType: 'standard' | 'sales_nav';
}

// --- URL Pattern Detection ---

export function detectLinkedInPageType(url: string): { pageType: LinkedInPageType; identifier: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!parsed.hostname.includes('linkedin.com')) return null;

  const path = parsed.pathname;

  // Standard profile: /in/username
  const standardMatch = path.match(/^\/in\/([^/?#]+)/);
  if (standardMatch) {
    return { pageType: 'standard_profile', identifier: standardMatch[1]! };
  }

  // Sales Navigator lead: /sales/lead/ID
  const salesLeadMatch = path.match(/^\/sales\/lead\/([^/?#]+)/);
  if (salesLeadMatch) {
    return { pageType: 'sales_nav_lead', identifier: salesLeadMatch[1]! };
  }

  // Sales Navigator people: /sales/people/ID
  const salesPeopleMatch = path.match(/^\/sales\/people\/([^/?#]+)/);
  if (salesPeopleMatch) {
    return { pageType: 'sales_nav_people', identifier: salesPeopleMatch[1]! };
  }

  // Company page: /company/name
  const companyMatch = path.match(/^\/company\/([^/?#]+)/);
  if (companyMatch) {
    return { pageType: 'company_page', identifier: companyMatch[1]! };
  }

  return null;
}

// --- /in/ URL extraction from Sales Navigator content ---

/**
 * Extract all /in/ profile URLs from page content text.
 * Returns an array of { username, url } objects.
 */
function extractInProfileLinks(content: string): Array<{ username: string; url: string }> {
  const regex = /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/g;
  const results: Array<{ username: string; url: string }> = [];
  const seen = new Set<string>();

  let match;
  while ((match = regex.exec(content)) !== null) {
    const username = match[1]!.toLowerCase();
    if (!seen.has(username)) {
      seen.add(username);
      results.push({ username, url: `https://www.linkedin.com/in/${match[1]}` });
    }
  }
  return results;
}

/**
 * Normalize a name to a URL-slug-like format for comparison.
 * "John Smith-Jones" → "john-smith-jones"
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Score how well a /in/ username matches a person's name.
 * Higher score = better match.
 */
function scoreUsernameMatch(username: string, name: string): number {
  const slug = nameToSlug(name);
  const uLower = username.toLowerCase();

  // Exact match: john-smith === john-smith
  if (uLower === slug) return 1.0;

  // Name parts are in the username
  const nameParts = name.toLowerCase().split(/\s+/);
  const matchingParts = nameParts.filter(p => uLower.includes(p));
  if (matchingParts.length === nameParts.length) return 0.9;

  // First and last name in username
  if (nameParts.length >= 2) {
    const first = nameParts[0]!;
    const last = nameParts[nameParts.length - 1]!;
    if (uLower.includes(first) && uLower.includes(last)) return 0.8;
  }

  // At least first name matches
  if (nameParts.length > 0 && uLower.includes(nameParts[0]!)) return 0.4;

  return 0;
}

/**
 * Find the canonical /in/ URL from Sales Navigator page content,
 * cross-validated against the person's name from the page title.
 */
export function findCanonicalInUrl(content: string, nameFromTitle: string): { url: string; username: string } | null {
  const links = extractInProfileLinks(content);
  if (links.length === 0) return null;

  // Score each link against the name
  let bestMatch: { url: string; username: string; score: number } | null = null;
  for (const link of links) {
    const score = scoreUsernameMatch(link.username, nameFromTitle);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { ...link, score };
    }
  }

  // Require at least 0.4 confidence (first name match)
  if (bestMatch && bestMatch.score >= 0.4) {
    return { url: bestMatch.url, username: bestMatch.username };
  }

  return null;
}

// --- Profile Field Extraction ---

/**
 * Extract the person's name from a LinkedIn page title.
 *
 * Standard: "John Smith - Senior Engineer - Anthropic | LinkedIn"
 * Sales Nav: "John Smith | LinkedIn Sales Navigator"
 * Premium:  "John Smith - Senior Engineer - Anthropic | LinkedIn"
 */
function extractNameFromTitle(title: string): string {
  return title
    .replace(/\s*\|?\s*(LinkedIn|Sales Navigator|LinkedIn Sales Navigator).*$/i, '')
    .replace(/\s*[-–—]\s*.+[-–—]\s*.+$/, (match) => {
      // If title is "Name - Role - Company", take only the name
      const parts = match.split(/\s*[-–—]\s*/);
      return ''; // Remove everything after name
    })
    .split(/\s*[-–—]\s*/)[0]!
    .replace(/\s*\(.*?\)\s*$/, '')
    .trim();
}

/**
 * Extract role and company from LinkedIn title.
 * "John Smith - Senior Engineer - Anthropic | LinkedIn" → { role: "Senior Engineer", company: "Anthropic" }
 */
function extractRoleCompanyFromTitle(title: string): { role?: string; company?: string } {
  const cleaned = title.replace(/\s*\|?\s*(LinkedIn|Sales Navigator).*$/i, '').trim();
  const parts = cleaned.split(/\s*[-–—]\s*/);

  if (parts.length >= 3) {
    return { role: parts[1]!.trim(), company: parts[2]!.trim() };
  }
  return {};
}

/**
 * Extract connection degree from content using pattern-anchored matching.
 * Only matches when near known LinkedIn labels.
 */
function extractConnectionDegree(content: string): string | null {
  // Look for patterns like "1st degree connection", "2nd degree", "3rd+"
  const degreePatterns = [
    /\b(1st|2nd|3rd\+?)\s*(?:degree)?\s*(?:connection|contact)/i,
    /(?:degree|connection)[:\s]*(1st|2nd|3rd\+?)/i,
    // Also match the badge-like format LinkedIn uses: just "1st" near the top
    // Only in first 500 chars to avoid false positives from content body
  ];

  for (const pattern of degreePatterns) {
    const match = content.match(pattern);
    if (match) return match[1]!.toLowerCase();
  }

  // Check first 500 chars for standalone degree (more likely to be the badge)
  const header = content.slice(0, 500);
  const headerMatch = header.match(/\b(1st|2nd|3rd\+?)\b/i);
  if (headerMatch) return headerMatch[1]!.toLowerCase();

  return null;
}

/**
 * Extract mutual connections count.
 * "12 mutual connections" → 12
 * "1 mutual connection" → 1
 */
function extractMutualConnections(content: string): number | null {
  const match = content.match(/(\d+)\s+(?:mutual|shared)\s+connections?/i);
  if (match) return parseInt(match[1]!, 10);
  return null;
}

/**
 * Extract lead tags from Sales Navigator content.
 * Sales Nav shows tags like "Saved", "Contacted", custom tags.
 */
function extractLeadTags(content: string): string[] {
  const tags: string[] = [];

  // Look for "Saved" indicator
  if (/\bSaved\s+(?:to|in)\s+/i.test(content) || /\bSaved\s+lead/i.test(content)) {
    tags.push('Saved');
  }

  // Look for "Contacted" indicator
  if (/\bContacted\b/i.test(content.slice(0, 1000))) {
    tags.push('Contacted');
  }

  // Look for "Viewed" indicator
  if (/\bViewed\s+(?:your\s+)?profile/i.test(content)) {
    tags.push('Viewed your profile');
  }

  return tags;
}

/**
 * Detect if this page has Premium-enriched content.
 * Premium profiles show more data: full experience, more connections visible, etc.
 */
function detectPremiumContent(content: string): boolean {
  const premiumSignals = [
    /premium\s*badge/i,
    /\bOpen\s+Profile\b/i,          // Open Profile is a Premium feature
    /\bInMail\b/i,                   // InMail button visible
    /\bSales\s+Navigator\b/i,       // Sales Nav is premium
    /\bGet\s+introduced\b/i,        // Premium connection feature
  ];

  return premiumSignals.some(p => p.test(content));
}

// --- Main Extraction ---

/**
 * Extract LinkedIn contact data from a page.
 * Handles standard profiles, Sales Navigator leads, and company pages.
 */
export function extractLinkedInContact(
  url: string,
  content: string,
  title: string,
): LinkedInExtractionResult {
  const pageInfo = detectLinkedInPageType(url);
  if (!pageInfo) {
    return { contact: null, companyEnrichment: null, pageType: 'standard_profile' };
  }

  const safeContent = content.length > MAX_CONTENT_LENGTH ? content.slice(0, MAX_CONTENT_LENGTH) : content;

  // --- Company Page ---
  if (pageInfo.pageType === 'company_page') {
    const companyName = title
      .replace(/\s*\|?\s*LinkedIn.*$/i, '')
      .replace(/\s*[-–—]\s*Overview.*$/i, '')
      .trim();

    if (companyName.length < 2) {
      return { contact: null, companyEnrichment: null, pageType: 'company_page' };
    }

    console.log(`[${utcTimestamp()}] [LINKEDIN] Company page detected: ${companyName}`);
    return {
      contact: null,
      companyEnrichment: { companyName, companyUrl: url },
      pageType: 'company_page',
    };
  }

  // --- Profile Pages (Standard + Sales Nav) ---
  const isSalesNav = pageInfo.pageType === 'sales_nav_lead' || pageInfo.pageType === 'sales_nav_people';
  const sourceType = isSalesNav ? 'sales_nav' as const : 'standard' as const;

  // Extract name from title
  const name = extractNameFromTitle(title);
  if (!name || name.length < 2) {
    return { contact: null, companyEnrichment: null, pageType: pageInfo.pageType };
  }

  // Determine the canonical profile URL
  let profileUrl: string;
  let username: string;

  if (isSalesNav) {
    // For Sales Nav: extract the /in/ URL from page content and cross-validate
    const canonical = findCanonicalInUrl(safeContent, name);
    if (!canonical) {
      console.log(`[${utcTimestamp()}] [LINKEDIN] Sales Nav profile skipped — no matching /in/ link for "${name}"`);
      return { contact: null, companyEnrichment: null, pageType: pageInfo.pageType };
    }
    profileUrl = canonical.url;
    username = canonical.username;
    console.log(`[${utcTimestamp()}] [LINKEDIN] Sales Nav → normalized to /in/${username} for "${name}"`);
  } else {
    profileUrl = url;
    username = pageInfo.identifier;
  }

  // Extract role/company from title
  const { role, company } = extractRoleCompanyFromTitle(title);

  // Extract headline from content
  let headline: string | undefined;
  const headlineMatch = safeContent.match(/(?:^|\n)([^\n]{10,100}(?:at|@|Engineer|Manager|Director|CEO|CTO|Founder|Developer|Designer|Consultant|VP|President|Head of|Lead)[^\n]*)/i);
  if (headlineMatch) {
    headline = headlineMatch[1]!.trim().slice(0, 200);
  }

  // Extract location
  let location: string | undefined;
  const locationMatch = safeContent.match(/(?:Greater |)([\w\s]+(?:Area|City|Metro|County|Region|, [A-Z]{2})[\w\s,]*)/);
  if (locationMatch) {
    location = locationMatch[1]!.trim().slice(0, 100);
  }

  // Extract website
  let website: string | undefined;
  const urlMatch = safeContent.match(/https?:\/\/(?!(?:www\.)?linkedin\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s)>"']*/);
  if (urlMatch) {
    website = urlMatch[0];
  }

  // Extract email from visible content
  // Import extractEmails from contact-extractor - we'll call it directly
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = safeContent.match(emailRegex) ?? [];
  let email: string | undefined;
  const blockedDomains = new Set(['linkedin.com', 'example.com', 'test.com']);
  const blockedPrefixes = new Set(['support', 'info', 'admin', 'noreply', 'no-reply', 'help', 'contact', 'sales', 'marketing', 'team']);
  for (const e of emailMatches) {
    const lower = e.toLowerCase();
    const [prefix, domain] = lower.split('@');
    if (!prefix || !domain) continue;
    if (blockedDomains.has(domain)) continue;
    if (blockedPrefixes.has(prefix)) continue;
    const tld = domain.split('.').pop() ?? '';
    if (['png', 'jpg', 'svg', 'css', 'js'].includes(tld)) continue;
    email = lower;
    break;
  }

  // LinkedIn-specific fields
  const connectionDegree = extractConnectionDegree(safeContent);
  const mutualConnections = extractMutualConnections(safeContent);
  const leadTags = isSalesNav ? extractLeadTags(safeContent) : [];
  const isPremiumData = isSalesNav || detectPremiumContent(safeContent);

  const contact: ContactInput = {
    name,
    headline,
    company,
    role,
    location,
    email,
    emailSource: email ? 'page_visible' : undefined,
    emailConfidence: email ? 0.7 : 0,
    website,
    profileUrl,
    platform: 'linkedin',
    rawData: {
      username,
      sourceType,
      pageType: pageInfo.pageType,
      connectionDegree,
      mutualConnections,
      leadTags: leadTags.length > 0 ? leadTags : undefined,
      isPremiumData,
      salesNavUrl: isSalesNav ? url : undefined,
    },
  };

  console.log(`[${utcTimestamp()}] [LINKEDIN] ${sourceType === 'sales_nav' ? '🔍' : '👤'} ${name} (@${username})${connectionDegree ? ` [${connectionDegree}]` : ''}${isPremiumData ? ' ⭐' : ''}`);

  return { contact, companyEnrichment: null, pageType: pageInfo.pageType };
}
