/**
 * Outbound alert formatting. Maps workspace `alert` events to operator-facing
 * messages. The set of outbound events required by the spec — task accepted,
 * blocked, approval needed, PR/ready, deploy/done, failure — all arrive here as
 * alerts raised by the workspace service.
 */
import type { Alert, AlertLevel, WorkspaceEvent } from '@yule/shared-types';

const ICON: Record<AlertLevel, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  critical: '🚨',
};

export function isAlert(e: WorkspaceEvent): e is Extract<WorkspaceEvent, { type: 'alert' }> {
  return e.type === 'alert';
}

export function formatAlert(a: Alert): string {
  const ref = a.sessionId ? ` \`${a.sessionId.slice(0, 8)}\`` : '';
  return `${ICON[a.level]} **${a.title}**${ref}\n${a.body}`;
}
