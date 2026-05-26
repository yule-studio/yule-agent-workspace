/**
 * Inbound command parsing + execution. Parsing is a pure function (unit
 * tested); execution delegates to the workspace API. Both the Discord slash
 * handlers and the mock stdin REPL use these.
 *
 * Supported commands (inbound surface from the requirements):
 *   task <role> <title>      create a task + run to the first gate
 *   status                   workspace status snapshot
 *   summary                  what currently needs the operator
 *   session <id>             query one session
 *   approve <id> [note]      persist an approval
 *   changes <id> [note]      request changes
 *   reject <id> [note]       reject / abandon
 */
import { AGENT_ROLES, type AgentRole } from '@yule/shared-types';
import type { WorkspaceClient } from './api-client.js';

export type Command =
  | { kind: 'help' }
  | { kind: 'status' }
  | { kind: 'summary' }
  | { kind: 'task'; role: AgentRole; title: string }
  | { kind: 'session'; id: string }
  | { kind: 'decide'; decision: 'approved' | 'changes_requested' | 'rejected'; id: string; note: string | null }
  | { kind: 'error'; message: string };

const DECISION: Record<string, 'approved' | 'changes_requested' | 'rejected'> = {
  approve: 'approved',
  changes: 'changes_requested',
  reject: 'rejected',
};

export function parseCommand(input: string): Command {
  const line = input.trim();
  if (!line) return { kind: 'error', message: 'empty command' };
  const [cmd, ...rest] = line.split(/\s+/);
  const head = (cmd ?? '').toLowerCase();

  switch (head) {
    case 'help':
      return { kind: 'help' };
    case 'status':
      return { kind: 'status' };
    case 'summary':
      return { kind: 'summary' };
    case 'task': {
      // Accept `task <role> <title>` and `task <role>: <title>`.
      const role = (rest[0] ?? '').toLowerCase().replace(/:$/, '') as AgentRole;
      if (!AGENT_ROLES.includes(role)) {
        return { kind: 'error', message: `unknown role '${rest[0] ?? ''}'. one of: ${AGENT_ROLES.join(', ')}` };
      }
      const title = rest.slice(1).join(' ').replace(/^:\s*/, '').trim();
      if (!title) return { kind: 'error', message: 'usage: task <role> <title>' };
      return { kind: 'task', role, title };
    }
    case 'session': {
      const id = rest[0];
      if (!id) return { kind: 'error', message: 'usage: session <id>' };
      return { kind: 'session', id };
    }
    case 'approve':
    case 'changes':
    case 'reject': {
      const id = rest[0];
      if (!id) return { kind: 'error', message: `usage: ${head} <session-id> [note]` };
      const note = rest.slice(1).join(' ').trim() || null;
      return { kind: 'decide', decision: DECISION[head]!, id, note };
    }
    default:
      return { kind: 'error', message: `unknown command '${head}'. try 'help'.` };
  }
}

const HELP = [
  '**yule-workspace bridge** — state lives in the workspace, not here.',
  '`task <role> <title>` — create a task and run it to the first gate',
  '`status` — workspace snapshot',
  '`summary` — what needs you right now',
  '`session <id>` — inspect a session',
  '`approve|changes|reject <id> [note]` — decide on an approval',
].join('\n');

export async function runCommand(client: WorkspaceClient, cmd: Command, actor: string): Promise<string> {
  switch (cmd.kind) {
    case 'help':
      return HELP;
    case 'error':
      return `⚠️ ${cmd.message}`;
    case 'status': {
      const s = await client.status();
      const states = Object.entries(s.sessionsByState)
        .map(([k, v]) => `${k}:${v}`)
        .join(' · ');
      return `📊 tasks ${s.tasks} · active ${s.activeSessions} · tokens ${(s.tokens.spentToday / 1000).toFixed(1)}k/${(s.tokens.dailyCap / 1000).toFixed(0)}k\n${states || 'no active sessions'}`;
    }
    case 'summary': {
      const { agents } = await client.agents();
      const waiting = agents.filter((a) =>
        ['awaiting_approval', 'blocked', 'ready_to_merge'].includes(a.state ?? ''),
      );
      if (waiting.length === 0) return '✅ nothing waiting — all clear.';
      return waiting
        .map((a) => `• **${a.role}** [${a.state}] ${a.statusLine ?? ''} — \`${a.currentSessionId}\``)
        .join('\n');
    }
    case 'task': {
      const res = await client.createTask({
        title: cmd.title,
        role: cmd.role,
        source: 'discord',
        autostart: true,
      });
      const session = res.sessionId ? await client.session(res.sessionId) : null;
      const state = session ? session.session.state : 'created';
      return `🆕 task **${cmd.title}** (${cmd.role}) → state \`${state}\`\nsession \`${res.sessionId ?? '—'}\``;
    }
    case 'session': {
      const { session, availableEvents } = await client.session(cmd.id);
      return `🔎 \`${session.id.slice(0, 8)}\` ${session.role} [${session.state}] mode=${session.runtimeMode}\nbudget ${session.budget.used}/${session.budget.cap} · actions: ${availableEvents.join(', ') || 'none'}`;
    }
    case 'decide': {
      const { session } = await client.decide(cmd.id, cmd.decision, actor, cmd.note ?? undefined);
      return `🗳️ ${cmd.decision} → session now \`${session.state}\``;
    }
  }
}
