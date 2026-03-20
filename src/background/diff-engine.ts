/**
 * Diff engine — detects meaningful content changes between page snapshots.
 *
 * The diff engine prevents sending duplicate content to OpenClaw.
 * Only sends when the page content has meaningfully changed.
 *
 * "Meaningful" means: actual text content changed, not just class names
 * or style attributes. We compare content strings, not DOM trees.
 */

export interface DiffResult {
  hasChanged: boolean;
  changeRatio: number; // 0.0 = identical, 1.0 = completely different
  newContent: string;
}

/**
 * Compare two content snapshots and determine if there's a meaningful change.
 *
 * Uses a fast hash comparison first, then a character-level estimate
 * for the change ratio.
 */
export function diffContent(
  previous: string | null,
  current: string,
): DiffResult {
  // First snapshot — always "changed"
  if (previous === null) {
    return { hasChanged: true, changeRatio: 1.0, newContent: current };
  }

  // Fast path: identical strings
  if (previous === current) {
    return { hasChanged: false, changeRatio: 0.0, newContent: current };
  }

  // Fast path: empty content
  if (current.length === 0) {
    return { hasChanged: previous.length > 0, changeRatio: 1.0, newContent: current };
  }

  // Compute approximate change ratio using length difference and sample comparison
  const changeRatio = estimateChangeRatio(previous, current);

  // Threshold: less than 2% change is probably noise (ads, timestamps, counters)
  const NOISE_THRESHOLD = 0.02;

  return {
    hasChanged: changeRatio > NOISE_THRESHOLD,
    changeRatio,
    newContent: current,
  };
}

/**
 * Estimate how different two strings are without a full diff algorithm.
 * Uses a combination of length difference and sampled character comparison.
 * This is O(n) where n = sample size, not O(nm) like a full diff.
 */
function estimateChangeRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;

  // Length difference contributes to change ratio
  const lengthDiff = Math.abs(a.length - b.length) / maxLen;

  // Sample-based character comparison (check every Nth character)
  const minLen = Math.min(a.length, b.length);
  const sampleSize = Math.min(minLen, 1000);
  const step = Math.max(1, Math.floor(minLen / sampleSize));

  let differences = 0;
  let samples = 0;

  for (let i = 0; i < minLen; i += step) {
    samples++;
    if (a[i] !== b[i]) {
      differences++;
    }
  }

  const sampleDiffRatio = samples > 0 ? differences / samples : 0;

  // Weighted combination: length diff matters more for large changes,
  // sample diff matters more for edits within similar-length text
  return Math.min(1.0, lengthDiff * 0.4 + sampleDiffRatio * 0.6);
}
