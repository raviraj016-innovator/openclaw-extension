/**
 * Classifier tests — adversarial coverage for the trust-critical component.
 *
 * ~20 test cases covering:
 * - Known domain lists (allow + block)
 * - Content heuristics (password, credit card)
 * - User overrides (highest priority)
 * - Adversarial cases (unusual URLs, edge cases)
 * - Privileged URLs (chrome://, about:, data:, file://)
 * - Default BLOCK for unknowns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Classifier } from '../../src/background/classifier.js';
import { createMockPlatform } from '../fixtures/mock-platform.js';

const mockPlatform = createMockPlatform();

describe('Classifier', () => {
  let classifier: Classifier;

  beforeEach(() => {
    classifier = new Classifier(mockPlatform);
  });

  // --- Known Allow List ---

  it('allows github.com', () => {
    const result = classifier.classify('https://github.com/org/repo');
    expect(result.classification).toBe('allowed');
    expect(result.source).toBe('known_allow_list');
  });

  it('allows jira.atlassian.net', () => {
    const result = classifier.classify('https://mycompany.atlassian.net/browse/PROJ-123');
    expect(result.classification).toBe('allowed');
    expect(result.source).toBe('known_allow_list');
  });

  it('allows subdomains of known domains', () => {
    const result = classifier.classify('https://gist.github.com/user/abc');
    expect(result.classification).toBe('allowed');
  });

  // --- Known Block List ---

  it('blocks chase.com', () => {
    const result = classifier.classify('https://chase.com/account');
    expect(result.classification).toBe('blocked');
    expect(result.source).toBe('known_block_list');
  });

  it('blocks wellsfargo.com', () => {
    const result = classifier.classify('https://wellsfargo.com/banking');
    expect(result.classification).toBe('blocked');
    expect(result.source).toBe('known_block_list');
  });

  it('blocks 1password.com', () => {
    const result = classifier.classify('https://1password.com/vault');
    expect(result.classification).toBe('blocked');
    expect(result.source).toBe('known_block_list');
  });

  it('blocks mychart.com (medical)', () => {
    const result = classifier.classify('https://mychart.com/patient');
    expect(result.classification).toBe('blocked');
  });

  // --- Content Heuristics ---

  it('blocks pages with password fields on unknown domains', () => {
    const result = classifier.classify('https://unknown-site.com/login', true, false);
    expect(result.classification).toBe('blocked');
    expect(result.source).toBe('heuristic_block');
    expect(result.reason).toContain('Password field');
  });

  it('blocks pages with credit card fields', () => {
    const result = classifier.classify('https://shop.example.com/checkout', false, true);
    expect(result.classification).toBe('blocked');
    expect(result.source).toBe('heuristic_block');
    expect(result.reason).toContain('Credit card');
  });

  it('allows github.com even with login form (known list wins)', () => {
    const result = classifier.classify('https://github.com/login', true, false);
    expect(result.classification).toBe('allowed');
    expect(result.source).toBe('known_allow_list');
  });

  // --- Domain Pattern Heuristics ---

  it('blocks domains with "bank" in the name', () => {
    const result = classifier.classify('https://fintech-bank.io/dashboard');
    expect(result.classification).toBe('blocked');
    expect(result.source).toBe('heuristic_block');
  });

  it('blocks domains with "health" in the name', () => {
    const result = classifier.classify('https://myhealth-portal.com/records');
    expect(result.classification).toBe('blocked');
    expect(result.source).toBe('heuristic_block');
  });

  // --- User Overrides ---

  it('allows user-overridden domain (override wins over default block)', async () => {
    await classifier.setOverride('myblog.com', 'allowed');
    const result = classifier.classify('https://myblog.com/post/123');
    expect(result.classification).toBe('allowed');
    expect(result.source).toBe('user_override');
  });

  it('blocks user-overridden domain (override wins over known allow list)', async () => {
    await classifier.setOverride('github.com', 'blocked');
    const result = classifier.classify('https://github.com/org/repo');
    expect(result.classification).toBe('blocked');
    expect(result.source).toBe('user_override');
  });

  // --- Privileged URLs ---

  it('blocks chrome:// URLs', () => {
    const result = classifier.classify('chrome://extensions');
    expect(result.classification).toBe('blocked');
  });

  it('blocks about:blank', () => {
    const result = classifier.classify('about:blank');
    expect(result.classification).toBe('blocked');
  });

  it('blocks data: URLs', () => {
    const result = classifier.classify('data:text/html,<h1>test</h1>');
    expect(result.classification).toBe('blocked');
  });

  it('blocks file:// URLs', () => {
    const result = classifier.classify('file:///home/user/document.html');
    expect(result.classification).toBe('blocked');
  });

  // --- Default Allow ---

  it('allows unknown domains by default', () => {
    const result = classifier.classify('https://totally-unknown-site-12345.com');
    expect(result.classification).toBe('allowed');
    expect(result.source).toBe('default_allow');
  });

  it('allows normal blog with no signals', () => {
    const result = classifier.classify('https://some-random-blog.wordpress.com');
    expect(result.classification).toBe('allowed');
    expect(result.source).toBe('default_allow');
  });

  // --- Edge Cases ---

  it('handles invalid URLs gracefully', () => {
    const result = classifier.classify('not-a-url');
    expect(result.classification).toBe('blocked');
  });

  it('handles empty URL', () => {
    const result = classifier.classify('');
    expect(result.classification).toBe('blocked');
  });

  // --- Teach OpenClaw ---

  it('teaches a domain as work tool', async () => {
    await classifier.teachDomain('internal-tool.company.com', true);
    const result = classifier.classify('https://internal-tool.company.com/dashboard');
    expect(result.classification).toBe('allowed');
    expect(result.source).toBe('user_override');
  });

  it('teaches a domain as non-work', async () => {
    await classifier.teachDomain('personal-site.com', false);
    const result = classifier.classify('https://personal-site.com/');
    expect(result.classification).toBe('blocked');
    expect(result.source).toBe('user_override');
  });
});
