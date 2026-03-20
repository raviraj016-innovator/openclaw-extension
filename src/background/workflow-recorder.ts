/**
 * Workflow recorder — observes user browsing patterns and detects
 * repeating workflows.
 *
 * Subscribes to user actions from the content script recorder hooks.
 * Detects patterns like: "user visits Datadog, then Jira, then GitHub
 * every morning" and offers to automate/summarize.
 */

import type { UserAction, WorkflowPattern } from '../shared/types.js';
import type { Platform } from '../platform/platform.js';

const STORAGE_KEY = 'workflowPatterns';
const MIN_PATTERN_FREQUENCY = 3; // Must be observed 3+ times to suggest
const SEQUENCE_TIMEOUT_MS = 5 * 60 * 1000; // 5 min gap = new sequence
const MAX_SEQUENCES = 100;
const MAX_PATTERNS = 50;

interface BrowsingSequence {
  urls: string[];
  startTime: number;
  lastActionTime: number;
}

export type WorkflowCallback = (pattern: WorkflowPattern) => void;

export class WorkflowRecorder {
  private platform: Platform;
  private callback: WorkflowCallback;
  private currentSequence: BrowsingSequence | null = null;
  private sequences: BrowsingSequence[] = [];
  private patterns: WorkflowPattern[] = [];

  constructor(platform: Platform, callback: WorkflowCallback) {
    this.platform = platform;
    this.callback = callback;
  }

  async load(): Promise<void> {
    const stored = await this.platform.persistentStorage.get<WorkflowPattern[]>(STORAGE_KEY);
    if (stored) {
      this.patterns = stored;
    }
  }

  /** Record a user action from the content script */
  recordAction(action: UserAction): void {
    const now = Date.now();

    // Start new sequence if gap too large or none exists
    if (!this.currentSequence ||
        now - this.currentSequence.lastActionTime > SEQUENCE_TIMEOUT_MS) {
      if (this.currentSequence && this.currentSequence.urls.length >= 2) {
        this.sequences.push(this.currentSequence);
        this.trimSequences();
        this.detectPatterns();
      }
      this.currentSequence = {
        urls: [],
        startTime: now,
        lastActionTime: now,
      };
    }

    // Only track navigations (page visits), not every click
    if (action.type === 'navigation' || action.type === 'click') {
      const domain = this.extractDomain(action.url);
      const lastUrl = this.currentSequence.urls[this.currentSequence.urls.length - 1];
      if (domain && domain !== lastUrl) {
        this.currentSequence.urls.push(domain);
        this.currentSequence.lastActionTime = now;
      }
    }
  }

  /** Get detected patterns (frequency >= threshold) */
  getPatterns(): WorkflowPattern[] {
    return this.patterns.filter((p) => p.frequency >= MIN_PATTERN_FREQUENCY);
  }

  private detectPatterns(): void {
    // Find common subsequences across recorded sequences
    // Simple approach: look for sequences of 2-5 domains that repeat

    const domainSequences = this.sequences.map((s) => s.urls);
    const subsequenceCounts = new Map<string, number>();

    for (const seq of domainSequences) {
      // Generate all subsequences of length 2-5
      for (let len = 2; len <= Math.min(5, seq.length); len++) {
        for (let start = 0; start <= seq.length - len; start++) {
          const sub = seq.slice(start, start + len).join(' → ');
          subsequenceCounts.set(sub, (subsequenceCounts.get(sub) ?? 0) + 1);
        }
      }
    }

    // Find patterns that meet the threshold
    for (const [subseq, count] of subsequenceCounts) {
      if (count >= MIN_PATTERN_FREQUENCY) {
        const existing = this.patterns.find((p) => p.name === subseq);
        if (existing) {
          if (count > existing.frequency) {
            existing.frequency = count;
            existing.lastSeen = new Date().toISOString();
          }
        } else {
          const pattern: WorkflowPattern = {
            id: crypto.randomUUID(),
            name: subseq,
            steps: [], // Would need to reconstruct from domain sequence
            frequency: count,
            lastSeen: new Date().toISOString(),
          };
          this.patterns.push(pattern);
          this.callback(pattern);
        }
      }
    }

    this.trimPatterns();
    this.persist();
  }

  private extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  private trimSequences(): void {
    if (this.sequences.length > MAX_SEQUENCES) {
      this.sequences = this.sequences.slice(-MAX_SEQUENCES);
    }
  }

  private trimPatterns(): void {
    if (this.patterns.length > MAX_PATTERNS) {
      // Keep the most frequent patterns
      this.patterns.sort((a, b) => b.frequency - a.frequency);
      this.patterns = this.patterns.slice(0, MAX_PATTERNS);
    }
  }

  private persist(): void {
    this.platform.persistentStorage.set(STORAGE_KEY, this.patterns).catch(() => {
      // Storage write failed — patterns will be recalculated
    });
  }
}
