/**
 * Yule Agent Lab — the Phaser scene factory.
 *
 * Phaser touches `window` at import time, so this module never imports it
 * statically: the client wrapper passes the loaded Phaser namespace into
 * `makeLabScene(Phaser)`, which returns a Scene subclass. That keeps Next's
 * server render free of any Phaser reference.
 *
 * The scene loads the Tiled map + the two baked atlases, renders the floor and
 * wall tile layers, places furniture from the `furniture` object layer (depth
 * sorted by base-y), and binds live agents onto seats, moving them between
 * zones as their activity changes. React owns only the HUD/overlay; everything
 * spatial lives here.
 */
import type { AgentView } from '@yule/shared-types';

export interface SceneCallbacks {
  onAgentClick?: (agentId: string, clientX: number, clientY: number) => void;
  onReady?: () => void;
  onBackgroundClick?: () => void;
}

export type Phase = 'dawn' | 'morning' | 'day' | 'sunset' | 'evening' | 'night';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow';
/** Screen-space tint per KST phase — daytime is neutral, dusk/night darken. */
const TINT: Record<Phase, { c: number; a: number }> = {
  dawn: { c: 0x7a6fae, a: 0.2 },
  morning: { c: 0xffe39a, a: 0.07 },
  day: { c: 0xffffff, a: 0 },
  sunset: { c: 0xe6824f, a: 0.18 },
  evening: { c: 0x28325a, a: 0.34 },
  night: { c: 0x0f1430, a: 0.48 },
};

interface SeatSlot {
  x: number;
  y: number;
  role: string;
  facing: 'up' | 'down';
  zone: string;
  desk: string;          // office-desk sprite shown when empty / agent away
  taken?: string | null;
  deskImg?: any;
  chairImg?: any;
}
interface Poi {
  name: string;
  kind: string;
  cx: number;
  cy: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const ATLAS = '/assets/yule-office/atlas';
const VENDOR = '/vendor/yule-office';
const SKINS = 18;
const AGENT_SCALE = 0.42;  // walking / standing sprite
const WS_SCALE = 0.82;     // seated-at-desk composite
const DESK_SCALE = 0.3;    // empty desk shown when the seat's agent is away

const propVal = (o: any, name: string) => o.properties?.find((p: any) => p.name === name)?.value;

/** Which poi an activity sends the agent to (else it stays at its desk). */
function zoneForActivity(a: AgentView): string | null {
  switch (a.activity) {
    case 'meeting': return 'standup';
    case 'reviewing': return 'review-table';
    case 'planning': return 'planning-area';
    case 'waiting': return 'approval'; // Tech Lead / Human Approval office
    default: return null; // coding / reading / running / blocked / idle / done → desk
  }
}

type Bubble = { text: string; tone: 'urgent' | 'warn' | 'talk' | 'work' | 'idle' } | null;
const AMBIENT = ['☕', '…', '🎧', '💭'];
/** A speech bubble for the activity — most agents stay silent (no idle spam). */
function bubbleFor(a: AgentView): Bubble {
  switch (a.activity) {
    case 'blocked': return { text: 'Blocked — need a hand', tone: 'urgent' };
    case 'waiting': return { text: 'Awaiting approval', tone: 'warn' };
    case 'meeting': return { text: a.currentTaskTitle ? 'Standup' : 'Syncing…', tone: 'talk' };
    case 'reviewing': return { text: 'Reviewing PR…', tone: 'work' };
    case 'running': return { text: 'Running tests…', tone: 'work' };
    case 'planning': return { text: 'Planning…', tone: 'talk' };
    case 'coding': return { text: 'Writing code…', tone: 'work' };
    case 'idle':
      // sparse ambient — deterministic per agent so it isn't noisy
      return a.avatarSeed % 5 === 0 ? { text: AMBIENT[a.avatarSeed % AMBIENT.length], tone: 'idle' } : null;
    default: return null; // reading / done → quiet
  }
}
const TONE: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: '#b5403f', fg: '#fff4f4' },
  warn: { bg: '#b98326', fg: '#fff8ec' },
  talk: { bg: '#2c3340', fg: '#dfe6f2' },
  work: { bg: '#1f6f5c', fg: '#eafff7' },
  idle: { bg: '#2a2e36', fg: '#cdd3dd' },
};

export function makeLabScene(Phaser: typeof import('phaser')) {
  return class LabScene extends Phaser.Scene {
    cb: SceneCallbacks = {};
    agents: AgentView[] = [];
    seats: SeatSlot[] = [];
    pois: Record<string, Poi> = {};
    sprites = new Map<string, any>(); // agentId → container {sprite, bubble, ...}
    assigned = new Map<string, SeatSlot>();
    minZoom = 0.4;
    dragging = false;
    dragMoved = 0;
    last = { x: 0, y: 0 };
    tintRect: any = null;
    rain: any = null;
    snow: any = null;
    clouds: any[] = [];
    doors: { spr: any; x: number; y: number; open: number }[] = [];
    env: { phase: Phase; weather: Weather } = { phase: 'day', weather: 'clear' };

    constructor() {
      super('lab');
    }

    init() {
      this.cb = (this.game.registry.get('cb') as SceneCallbacks) ?? {};
      this.agents = (this.game.registry.get('agents') as AgentView[]) ?? [];
      this.env = (this.game.registry.get('env') as { phase: Phase; weather: Weather }) ?? this.env;
    }

    preload() {
      this.load.image('tiles', `${VENDOR}/tiles.png`);
      this.load.tilemapTiledJSON('lab', `${VENDOR}/yule-agent-lab.tmj`);
      this.load.atlas('office', `${ATLAS}/office-objects.png`, `${ATLAS}/office-objects.json`);
      this.load.atlas('agents', `${ATLAS}/agents.png`, `${ATLAS}/agents.json`);
      this.load.atlas('ws', `${ATLAS}/workstations.png`, `${ATLAS}/workstations.json`);
    }

    create() {
      const map = this.make.tilemap({ key: 'lab' });
      const ts = map.addTilesetImage('lab', 'tiles')!;
      map.createLayer('floor', ts, 0, 0)!.setDepth(-1000);
      map.createLayer('walls', ts, 0, 0)!.setDepth(-500);

      // furniture, depth-sorted by base-y (+ z bias)
      const furn = map.getObjectLayer('furniture')?.objects ?? [];
      for (const o of furn) {
        const name = propVal(o, 'sprite');
        if (!this.textures.getFrame('office', name)) continue;
        const scale = propVal(o, 'scale') ?? 0.4;
        const z = propVal(o, 'z') ?? 0;
        this.add.image(o.x!, o.y!, 'office', name).setOrigin(0.5, 1).setScale(scale).setDepth(o.y! + z * 4);
      }

      // seats + pois. Each seat owns an empty-desk + chair shown when its agent
      // is away; an occupied+working seat swaps to the seated composite (update).
      this.seats = (map.getObjectLayer('seats')?.objects ?? []).map((o: any) => {
        const facing = (propVal(o, 'facing') as 'up' | 'down') ?? 'up';
        const desk = propVal(o, 'desk') ?? (facing === 'down' ? 'desk_ai_back' : 'desk_ai_front');
        const s: SeatSlot = { x: o.x, y: o.y, role: propVal(o, 'role') ?? 'member', facing, zone: propVal(o, 'zone') ?? 'desk', desk, taken: null };
        // composites always have the desk below the agent → empty state matches:
        // desk below the seat anchor, chair tucked above (behind the desk).
        const dsk = this.textures.getFrame('office', desk) ? desk : 'desk_ai_back';
        s.deskImg = this.add.image(s.x, s.y + 16, 'office', dsk).setOrigin(0.5, 0.5).setScale(DESK_SCALE).setDepth(s.y + 16);
        s.chairImg = this.add.image(s.x, s.y - 12, 'office', facing === 'down' ? 'chair_mesh_black' : 'chair_mesh_dark')
          .setOrigin(0.5, 0.5).setScale(0.26).setDepth(s.y - 14);
        return s;
      });
      for (const o of map.getObjectLayer('pois')?.objects ?? []) {
        this.pois[o.name!] = {
          name: o.name!, kind: propVal(o, 'kind') ?? '', x: o.x!, y: o.y!, w: o.width!, h: o.height!,
          cx: o.x! + o.width! / 2, cy: o.y! + o.height! / 2,
        };
      }

      // doors — sit in their wall opening, opened by nearby agents (see update)
      for (const o of map.getObjectLayer('doors')?.objects ?? []) {
        if (!this.textures.getFrame('office', 'door_0')) break;
        const spr = this.add.image(o.x!, o.y!, 'office', 'door_0').setOrigin(0.5, 0.55).setScale(0.26).setDepth(o.y! - 40);
        this.doors.push({ spr, x: o.x!, y: o.y!, open: 0 });
      }

      this.buildAnims();
      this.setupCamera(map.widthInPixels, map.heightInPixels);
      this.setupInput();
      this.setupEnv();
      this.setEnv(this.env.phase, this.env.weather);
      this.syncAgents(this.agents);

      this.scale.on('resize', () => {
        this.fitCamera(map.widthInPixels, map.heightInPixels);
        this.tintRect?.setSize(this.scale.width, this.scale.height);
      });
      this.cb.onReady?.();
    }

    setupEnv() {
      // screen-space tint overlay (above the world, below the React HUD)
      this.tintRect = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(2_000_000);
      // generated particle textures — no asset round-trip
      if (!this.textures.exists('px-rain')) {
        const g = this.add.graphics();
        g.fillStyle(0xbcd2e8, 1).fillRect(0, 0, 2, 11); g.generateTexture('px-rain', 2, 11);
        g.clear(); g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3); g.generateTexture('px-snow', 6, 6);
        g.destroy();
      }
    }

    setEnv(phase: Phase, weather: Weather) {
      this.env = { phase, weather };
      const t = TINT[phase] ?? TINT.day;
      this.tintRect?.setFillStyle(t.c, t.a);

      const wantRain = weather === 'rain', wantSnow = weather === 'snow';
      const wantClouds = weather !== 'clear';
      if (wantRain && !this.rain) {
        this.rain = this.add.particles(0, -20, 'px-rain', {
          x: { min: -100, max: 2400 }, y: -20, lifespan: 1300, quantity: 5, frequency: 26,
          speedY: { min: 680, max: 880 }, speedX: { min: -160, max: -110 },
          scaleY: { min: 0.7, max: 1.3 }, alpha: { start: 0.55, end: 0.4 },
        }).setScrollFactor(0).setDepth(2_100_000);
      }
      this.rain?.setVisible(wantRain); wantRain ? this.rain?.start() : this.rain?.stop();
      if (wantSnow && !this.snow) {
        this.snow = this.add.particles(0, -20, 'px-snow', {
          x: { min: -50, max: 2400 }, y: -20, lifespan: 6000, quantity: 2, frequency: 90,
          speedY: { min: 50, max: 110 }, speedX: { min: -40, max: 40 },
          scale: { min: 0.4, max: 1 }, alpha: { start: 0.9, end: 0.7 }, rotate: { min: 0, max: 360 },
        }).setScrollFactor(0).setDepth(2_100_000);
      }
      this.snow?.setVisible(wantSnow); wantSnow ? this.snow?.start() : this.snow?.stop();

      if (wantClouds && this.clouds.length === 0) this.spawnClouds();
      this.clouds.forEach((c) => c.setVisible(wantClouds));
    }

    spawnClouds() {
      for (let i = 0; i < 4; i++) {
        const c = this.add.ellipse(200 + i * 360, 120 + (i % 2) * 90, 280, 90, 0xf2f4f8, 0.12)
          .setScrollFactor(0.15).setDepth(1_900_000);
        this.tweens.add({ targets: c, x: c.x + 400, duration: 60000 + i * 12000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.clouds.push(c);
      }
    }

    buildAnims() {
      for (let i = 0; i < SKINS; i++) {
        const id = `skin${String(i).padStart(2, '0')}`;
        if (this.anims.exists(`walk_${id}`)) continue;
        const f = (p: string) => ({ key: 'agents', frame: `${id}_${p}` });
        this.anims.create({ key: `walk_${id}`, frames: [f('walk1'), f('idle'), f('walk2'), f('idle')], frameRate: 7, repeat: -1 });
      }
    }

    setupCamera(mw: number, mh: number) {
      const cam = this.cameras.main;
      cam.setBounds(0, 0, mw, mh);
      this.fitCamera(mw, mh);
    }
    fitCamera(mw: number, mh: number) {
      const cam = this.cameras.main;
      this.minZoom = Math.min(cam.width / mw, cam.height / mh);
      cam.setZoom(Math.max(cam.zoom || 0, this.minZoom) || this.minZoom);
      if (cam.zoom < this.minZoom) cam.setZoom(this.minZoom);
      cam.centerOn(mw / 2, mh / 2);
    }

    setupInput() {
      this.input.on('pointerdown', (p: any) => { this.dragging = true; this.dragMoved = 0; this.last = { x: p.x, y: p.y }; });
      this.input.on('pointermove', (p: any) => {
        if (!this.dragging || !p.isDown) return;
        const cam = this.cameras.main;
        cam.scrollX -= (p.x - this.last.x) / cam.zoom;
        cam.scrollY -= (p.y - this.last.y) / cam.zoom;
        this.dragMoved += Math.abs(p.x - this.last.x) + Math.abs(p.y - this.last.y);
        this.last = { x: p.x, y: p.y };
      });
      this.input.on('pointerup', (p: any) => {
        const wasDrag = this.dragMoved > 8;
        this.dragging = false;
        if (!wasDrag && !(p.downElement && this.pickedAgent)) this.cb.onBackgroundClick?.();
        this.pickedAgent = null;
      });
      this.input.on('wheel', (_p: any, _o: any, _dx: number, dy: number) => {
        const cam = this.cameras.main;
        const z = Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), this.minZoom, 2.6);
        cam.setZoom(z);
      });
    }
    pickedAgent: string | null = null;

    // ---- agents -----------------------------------------------------------
    allocate(agents: AgentView[]) {
      // explicit override (metadata.seat) → then role match → then any free
      this.seats.forEach((s) => (s.taken = null));
      this.assigned.clear();
      const free = () => this.seats.filter((s) => !s.taken);
      const byRoleHint = (a: AgentView) => {
        const t = `${a.role} ${a.title} ${(a.capabilities ?? []).join(' ')}`.toLowerCase();
        if (t.includes('lead') || t.includes('coordinator')) return 'lead';
        if (t.includes('devops') || t.includes('infra') || t.includes('platform') || t.includes('ops')) return 'devops';
        if (t.includes('product') || t.includes('design') || t.includes('plan')) return 'product';
        return 'member';
      };
      const sorted = [...agents].sort((a, b) => (byRoleHint(a) === 'lead' ? -1 : 0) - (byRoleHint(b) === 'lead' ? -1 : 0));
      for (const a of sorted) {
        const want = byRoleHint(a);
        let seat = free().find((s) => s.role === want) ?? free().find((s) => s.role === 'member') ?? free()[0];
        if (!seat) break;
        seat.taken = a.id;
        this.assigned.set(a.id, seat);
      }
    }

    targetFor(a: AgentView): { x: number; y: number; facing: 'up' | 'down'; seated: boolean } {
      const zone = zoneForActivity(a);
      if (zone && this.pois[zone]) {
        // gather around the poi centre deterministically (standing, not seated)
        const idx = [...this.assigned.keys()].indexOf(a.id);
        const p = this.pois[zone];
        const cols = Math.max(1, Math.floor(p.w / 60));
        const gx = (idx % cols) - (cols - 1) / 2;
        const gy = Math.floor(idx / cols) % 2;
        return { x: p.cx + gx * 46, y: p.cy + gy * 40, facing: 'down', seated: false };
      }
      const seat = this.assigned.get(a.id);
      if (seat) return { x: seat.x, y: seat.y, facing: seat.facing, seated: true };
      return { x: this.pois['lounge']?.cx ?? 880, y: this.pois['lounge']?.cy ?? 640, facing: 'down', seated: false };
    }

    setBubble(c: any, b: Bubble) {
      let t = c.getData('bubble');
      if (!b) { if (t) { t.destroy(); c.setData('bubble', null); } return; }
      const tone = TONE[b.tone];
      if (!t) {
        t = this.add.text(c.x, c.y, b.text, {
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '13px', color: tone.fg,
          backgroundColor: tone.bg, padding: { x: 6, y: 3 }, align: 'center',
        }).setOrigin(0.5, 1).setDepth(1e6);
        c.setData('bubble', t);
      }
      if (t.text !== b.text) t.setText(b.text);
      t.setColor(tone.fg);
      t.setBackgroundColor(tone.bg);
      t.setData('urgent', b.tone === 'urgent');
    }

    onPick = (id: string, p: any) => {
      this.pickedAgent = id;
      this.cb.onAgentClick?.(id, p.event?.clientX ?? p.x, p.event?.clientY ?? p.y);
    };

    /** Seated-at-desk composite for a skin (lazy). Null if that skin lacks one. */
    ensureComposite(c: any, id: string, skin: string) {
      let comp = c.getData('comp');
      if (comp) return comp;
      if (!this.textures.getFrame('ws', `${skin}_wsfront`)) return null;
      comp = this.add.image(c.x, c.y, 'ws', `${skin}_wsfront`).setOrigin(0.5, 0.5).setScale(WS_SCALE).setVisible(false);
      comp.setInteractive({ useHandCursor: true });
      comp.on('pointerdown', (p: any) => this.onPick(id, p));
      c.setData('comp', comp);
      return comp;
    }

    syncAgents(agents: AgentView[]) {
      this.agents = agents;
      this.allocate(agents);
      const alive = new Set(agents.map((a) => a.id));
      for (const [id, c] of this.sprites) if (!alive.has(id)) { this.disposeAgent(c); this.sprites.delete(id); }

      for (const a of agents) {
        const skin = `skin${String(a.avatarSeed % SKINS).padStart(2, '0')}`;
        const tgt = this.targetFor(a);
        let c = this.sprites.get(a.id);
        if (!c) {
          c = this.add.sprite(tgt.x, tgt.y, 'agents', `${skin}_idle`).setOrigin(0.5, 1).setScale(AGENT_SCALE);
          c.setInteractive({ useHandCursor: true });
          c.on('pointerdown', (p: any) => this.onPick(a.id, p));
          this.sprites.set(a.id, c);
          c.setDepth(tgt.y);
        }
        c.setData('id', a.id);
        c.setData('skin', skin);
        c.setData('target', tgt);
        c.setData('working', (a.activity === 'coding' || a.activity === 'running' || a.activity === 'reading') && tgt.seated);
        this.setBubble(c, bubbleFor(a));
      }
    }

    disposeAgent(c: any) {
      c.getData('bubble')?.destroy();
      c.getData('glow')?.destroy();
      c.getData('comp')?.destroy();
      c.destroy();
    }

    update(t: number, dt: number) {
      const speed = 0.12 * dt; // px per frame
      const bubbleScale = Phaser.Math.Clamp(1 / this.cameras.main.zoom, 0.7, 1.6);

      // doors open as an agent nears, ease shut otherwise (5-frame swing)
      for (const d of this.doors) {
        let near = false;
        for (const [, c] of this.sprites) if (c.visible && Math.abs(c.x - d.x) < 70 && Math.abs(c.y - d.y) < 80) { near = true; break; }
        d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt / 140);
        d.spr.setFrame(`door_${Phaser.Math.Clamp(Math.round(d.open * 4), 0, 4)}`);
      }

      // empty desks visible by default; covered when their agent sits down
      for (const s of this.seats) { s.deskImg?.setVisible(true); s.chairImg?.setVisible(true); }

      for (const [, c] of this.sprites) {
        const tgt = c.getData('target');
        if (!tgt) continue;
        const dx = tgt.x - c.x, dy = tgt.y - c.y;
        const dist = Math.hypot(dx, dy);
        const skin = c.getData('skin');
        const id = c.getData('id');
        const moving = dist > 2;
        if (moving) {
          const step = Math.min(speed, dist);
          c.x += (dx / dist) * step; c.y += (dy / dist) * step;
          c.setDepth(c.y);
          if (Math.abs(dx) > 1) c.setFlipX(dx < 0);
          if (c.anims.getName() !== `walk_${skin}`) c.play(`walk_${skin}`);
        } else if (c.anims.isPlaying || c.getData('settled') !== tgt) {
          c.anims.stop(); c.setFlipX(false);
          c.setFrame(`${skin}_${tgt.seated ? 'sit' : 'idle'}`); c.setDepth(c.y);
          c.setData('settled', tgt);
        }

        // swap to the seated composite when arrived at the home seat
        const seat = this.assigned.get(id);
        const comp = c.getData('comp');
        const seatedNow = !moving && tgt.seated && seat && this.ensureComposite(c, id, skin);
        let rep = c; // the visible representation (for bubble/glow anchoring)
        if (seatedNow) {
          const cmp = comp ?? c.getData('comp');
          cmp.setFrame(seat!.facing === 'down' ? `${skin}_wsfront` : `${skin}_wsback`);
          cmp.setPosition(seat!.x, seat!.y).setDepth(seat!.y).setVisible(true);
          c.setVisible(false);
          seat!.deskImg?.setVisible(false); seat!.chairImg?.setVisible(false);
          rep = cmp;
        } else {
          c.setVisible(true);
          comp?.setVisible(false);
        }

        const bub = c.getData('bubble');
        if (bub) {
          const bob = bub.getData('urgent') ? Math.sin(t / 180) * 3 : 0;
          const top = rep === c ? rep.y - rep.displayHeight : rep.y - rep.displayHeight / 2;
          bub.setPosition(rep.x, top - 4 + bob).setScale(bubbleScale).setVisible(true);
        }
        // "screen on" glow on the workstation monitor while actively working
        let g = c.getData('glow');
        if (c.getData('working') && seatedNow) {
          if (!g) { g = this.add.ellipse(rep.x, rep.y, 26, 12, 0x6cd0ff, 0.5).setBlendMode(Phaser.BlendModes.ADD); c.setData('glow', g); }
          g.setPosition(rep.x, seat!.facing === 'down' ? rep.y + 6 : rep.y - 16).setDepth(seat!.y + 0.5)
            .setVisible(true).setAlpha(0.3 + 0.2 * (0.5 + 0.5 * Math.sin(t / 260)));
        } else if (g) g.setVisible(false);
      }
    }
  };
}
