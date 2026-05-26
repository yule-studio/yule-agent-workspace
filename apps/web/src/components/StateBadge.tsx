import type { RuntimeMode, SessionState } from '@yule/shared-types';

export function StateBadge({ state }: { state: SessionState | null }) {
  if (!state) return <span className="mode">idle</span>;
  return (
    <span className="badge" style={{ background: `var(--s-${state})` }}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

export function ModePill({ mode }: { mode: RuntimeMode }) {
  return <span className="mode">{mode}</span>;
}
