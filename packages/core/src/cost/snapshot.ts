/**
 * Session snapshots — compacted context for cheap recall.
 *
 * Instead of replaying the full transition history (and re-reading the whole
 * Vault) on every wake-up, the workspace keeps a small rolling summary. When an
 * agent needs context it gets the snapshot first and only expands to full
 * history on demand. This bounds the context window by default.
 */
import type { SessionSnapshot, SessionTransition } from '@yule/shared-types';

/** Rough token estimate (≈4 chars/token) for budgeting snapshot size. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Build a compact snapshot from the recent transitions. Deterministic and
 * cheap (no LLM) — this is the "free" compaction tier. A `synthesize` step can
 * later replace `summary` with a richer LLM summary when it is worth the spend.
 */
export function buildSnapshot(
  transitions: SessionTransition[],
  opts: { maxLines?: number; extraSummary?: string } = {},
): SessionSnapshot {
  const maxLines = opts.maxLines ?? 8;
  const recent = transitions.slice(-maxLines);
  const lines = recent.map(
    (t) => `${t.at.slice(0, 19)} ${t.fromState}→${t.toState} (${t.event}${t.reason ? `: ${t.reason}` : ''})`,
  );
  const head = opts.extraSummary ? `${opts.extraSummary}\n` : '';
  const summary = `${head}${lines.join('\n')}`.trim();
  return {
    summary,
    tokens: estimateTokens(summary),
    createdAt: new Date().toISOString(),
  };
}
