/**
 * Dynamic Yule HQ org model. Floors and teams are DERIVED from the live agent
 * registry (role + title + capability) — never a hardcoded agent/floor list.
 * Many agents of one capability auto-split into pods; unknown agents land on the
 * "General Studio" floor; a `metadata.floor/team` override is honoured first so
 * the structure can be tuned later without code changes.
 */
import type { AgentView } from '@yule/shared-types';

export interface Team {
  id: string;
  name: string;
  agents: AgentView[];
}
export interface Floor {
  id: string;
  name: string;
  accent: string;
  teams: Team[];
  agents: AgentView[];
  activeCount: number;
}
export interface Building {
  floors: Floor[];
}

/** Floor stacking order (top of building first) + accent colour. */
const FLOOR_ORDER: { name: string; accent: string }[] = [
  { name: 'Engineering', accent: '#38bdf8' },
  { name: 'AI & Product', accent: '#a78bfa' },
  { name: 'Growth & Sales', accent: '#2dd4bf' },
  { name: 'Platform & Ops', accent: '#818cf8' },
  { name: 'Operations', accent: '#22d3ee' },
  { name: 'General Studio', accent: '#7c8aa0' },
];

interface Placement {
  floor: string;
  team: string;
}

/** Classify an agent into (floor, team) from metadata / capabilities / role. */
function classify(a: AgentView): Placement {
  // explicit override wins
  if (a.metadata?.floor && a.metadata?.team) return { floor: a.metadata.floor, team: a.metadata.team };

  const t = [a.title, ...(a.capabilities ?? [])].join(' ').toLowerCase();
  switch (a.role) {
    case 'engineering':
      if (t.includes('devops') || t.includes('infra') || t.includes('platform'))
        return { floor: 'Platform & Ops', team: 'Platform / Infra' };
      if (t.includes('ai') || t.includes('ml')) return { floor: 'AI & Product', team: 'AI / Agent' };
      if (t.includes('qa') || t.includes('quality') || t.includes('test'))
        return { floor: 'Engineering', team: 'Quality' };
      if (t.includes('design')) return { floor: 'AI & Product', team: 'Product & Design' };
      return { floor: 'Engineering', team: 'Development' };
    case 'planning':
      return { floor: 'AI & Product', team: 'Planning' };
    case 'product':
      return { floor: 'AI & Product', team: 'Product & Design' };
    case 'marketing':
      return { floor: 'Growth & Sales', team: 'Growth & Marketing' };
    case 'sales-cs':
      return { floor: 'Growth & Sales', team: 'Sales & Customer' };
    case 'finance':
    case 'hr':
    case 'legal':
      return { floor: 'Operations', team: 'Operations' };
    default:
      return { floor: 'General Studio', team: 'Unassigned' };
  }
}

const isActive = (a: AgentView) => a.activity !== 'idle';

export function buildBuilding(agents: AgentView[]): Building {
  // group agents by floor -> team
  const floorMap = new Map<string, Map<string, AgentView[]>>();
  for (const a of agents) {
    const { floor, team } = classify(a);
    if (!floorMap.has(floor)) floorMap.set(floor, new Map());
    const teams = floorMap.get(floor)!;
    if (!teams.has(team)) teams.set(team, []);
    teams.get(team)!.push(a);
  }

  const order = (name: string) => {
    const i = FLOOR_ORDER.findIndex((f) => f.name === name);
    return i === -1 ? FLOOR_ORDER.length : i;
  };

  const POD = 4; // a team larger than this auto-splits into numbered pods

  const floors: Floor[] = [...floorMap.entries()]
    .map(([name, teamMap]) => {
      const teams: Team[] = [...teamMap.entries()]
        .flatMap(([tName, list]) => {
          const sorted = list.slice().sort((a, b) => a.name.localeCompare(b.name));
          // auto-split big teams (e.g. many engineers -> "Development 1/2")
          if (sorted.length <= POD) {
            return [{ id: `${name}:${tName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: tName, agents: sorted }];
          }
          const pods = Math.ceil(sorted.length / POD);
          const per = Math.ceil(sorted.length / pods);
          return Array.from({ length: pods }, (_, p) => ({
            id: `${name}:${tName}:${p}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: `${tName} ${p + 1}`,
            agents: sorted.slice(p * per, (p + 1) * per),
          }));
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      const flat = teams.flatMap((t) => t.agents);
      const accent = FLOOR_ORDER.find((f) => f.name === name)?.accent ?? '#7c8aa0';
      return {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name,
        accent,
        teams,
        agents: flat,
        activeCount: flat.filter(isActive).length,
      };
    })
    .sort((a, b) => order(a.name) - order(b.name));

  // The operator's penthouse — always the top floor, no assigned agents.
  const executive: Floor = {
    id: 'executive',
    name: 'Executive',
    accent: '#b59bd1',
    teams: [],
    agents: [],
    activeCount: 0,
  };

  return { floors: [executive, ...floors] };
}

/** Floor that should be auto-focused in "follow active" mode. */
export function busiestFloorId(b: Building): string | null {
  if (b.floors.length === 0) return null;
  const sorted = [...b.floors].sort((a, z) => z.activeCount - a.activeCount);
  return (sorted[0]!.activeCount > 0 ? sorted[0]! : b.floors[0]!).id;
}
