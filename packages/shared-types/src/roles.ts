/**
 * Agent roles. These mirror the role-based agents that live in the engine
 * (`yule-studio-agent`): the workspace does not invent agents, it *represents*
 * the engine's agents and tracks their live presence/state.
 */

export const AGENT_ROLES = [
  'engineering',
  'planning',
  'product',
  'marketing',
  'sales-cs',
  'finance',
  'hr',
  'legal',
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

export const AGENT_ROLE_LABEL: Record<AgentRole, string> = {
  engineering: 'Engineering',
  planning: 'Planning',
  product: 'Product',
  marketing: 'Marketing',
  'sales-cs': 'Sales / CS',
  finance: 'Finance',
  hr: 'HR',
  legal: 'Legal',
};

/**
 * Default desk position for each role in the pixel office (grid coordinates).
 * The office *map* is a static asset; these positions are code-driven so the
 * UI can render presence/state overlays without baking layout into art.
 */
export const AGENT_DESK: Record<AgentRole, { x: number; y: number }> = {
  engineering: { x: 2, y: 2 },
  planning: { x: 5, y: 2 },
  product: { x: 8, y: 2 },
  marketing: { x: 2, y: 5 },
  'sales-cs': { x: 5, y: 5 },
  finance: { x: 8, y: 5 },
  hr: { x: 2, y: 8 },
  legal: { x: 5, y: 8 },
};
