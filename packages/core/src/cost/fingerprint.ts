/**
 * Fingerprinting — the cheapest cost-control primitive. Before an agent
 * re-analyses a git diff or an issue, we hash the input. If the fingerprint
 * matches the one stored on the session, the prior analysis still holds and we
 * skip the (expensive) re-analysis entirely.
 */
import { createHash } from 'node:crypto';

/** Stable content hash. Whitespace-insensitive so cosmetic churn is ignored. */
export function fingerprint(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/** Fingerprint a unified diff, ignoring volatile header lines (index/hash). */
export function fingerprintDiff(diff: string): string {
  const stable = diff
    .split('\n')
    .filter((line) => !line.startsWith('index ') && !line.startsWith('@@'))
    .join('\n');
  return fingerprint(stable);
}

/** Fingerprint an issue from the fields that actually change its meaning. */
export function fingerprintIssue(issue: {
  title: string;
  body: string;
  state: string;
  labels?: string[];
}): string {
  const labels = (issue.labels ?? []).slice().sort().join(',');
  return fingerprint([issue.title, issue.body, issue.state, labels].join(''));
}

/**
 * Decide whether re-analysis is needed. Returns false (skip) only when a prior
 * fingerprint exists and matches the new content.
 */
export function needsReanalysis(prior: string | null, next: string): boolean {
  return prior === null || prior !== next;
}
