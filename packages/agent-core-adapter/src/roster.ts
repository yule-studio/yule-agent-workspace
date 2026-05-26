/**
 * Fallback agent roster — mirrors the real `yule-studio-agent` structure
 * (department agents + their member sub-agents, discovered from the engine's
 * agent manifests / member directories). This lives in the adapter layer, NOT
 * in the UI: the HttpAgentCoreAdapter will replace it with the engine's live
 * `GET /v1/agents`. The UI only ever sees the dynamic list.
 */
import type { AgentRole, StudioAgent } from '@yule/shared-types';

/** department -> member slugs (empty => the department itself is one agent). */
const MEMBERS: Record<AgentRole, string[]> = {
  engineering: [
    'tech-lead',
    'ai-engineer',
    'product-designer',
    'backend-engineer',
    'frontend-engineer',
    'qa-engineer',
    'devops-engineer',
    // additional members — proves the office grows dynamically with the registry
    'security-engineer',
    'data-engineer',
    'platform-engineer',
  ],
  planning: [],
  product: ['product-manager', 'user-researcher', 'growth-analyst'],
  marketing: ['brand-manager', 'content-strategist', 'growth-marketer', 'seo-specialist'],
  'sales-cs': ['customer-success', 'sales-rep'],
  finance: ['budget-analyst'],
  hr: ['recruiter', 'people-ops', 'culture-coach'],
  legal: ['contract-reviewer', 'privacy-officer'],
};

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function seed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 997;
}

/** Derive capability tags from a member slug (used for floor/team classification). */
function capsFor(slug: string): string[] {
  return slug.split('-').filter((w) => w !== 'engineer' && w !== 'agent');
}

export function defaultRoster(): StudioAgent[] {
  const out: StudioAgent[] = [];
  for (const role of Object.keys(MEMBERS) as AgentRole[]) {
    const members = MEMBERS[role];
    if (members.length === 0) {
      const id = `${role}-agent`;
      out.push({
        id,
        name: `${titleCase(role)} Lead`,
        role,
        title: 'coordinator',
        kind: 'department',
        capabilities: [role],
        metadata: null,
        avatarSeed: seed(id),
      });
      continue;
    }
    for (const m of members) {
      const id = `${role}-agent/${m}`;
      out.push({
        id,
        name: titleCase(m),
        role,
        title: m,
        kind: 'member',
        capabilities: capsFor(m),
        metadata: null,
        avatarSeed: seed(id),
      });
    }
  }
  return out;
}

/**
 * The agent registry source. `yule-studio-agent` is the eventual source of
 * truth (via the HTTP adapter's `GET /v1/agents`); until then this normalized
 * mock stands in. Named for discoverability — the workspace reads agents only
 * through the adapter, never a hardcoded UI list.
 */
export const getAgentRegistry = defaultRoster;
export const loadStudioAgents = defaultRoster;
