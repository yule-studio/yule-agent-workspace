/**
 * Yule Agent Lab — the Building (exterior) Phaser scene.
 *
 * One cohesive street scene anchored on the Yule Studio building, NOT a backdrop
 * with stickers. Two anchors drive everything:
 *   • a uniform-scaled (cover) sky/skyline band — never stretched, cropped as
 *     needed so its horizon/railing meets the ground baseline;
 *   • a single GROUND BASELINE shared by the building and every street prop,
 *     which are all scaled relative to the building's door height.
 * Props are grouped into street context (entrance / left curb / right sidewalk);
 * the "Enter the Lab" CTA sits at the door. Phaser is injected (SSR-safe).
 */
import type { Phase, Weather } from '@/office/useKst';

const ATLAS = '/assets/yule-office/atlas';
const SKY_IDX: Record<Phase, number> = { night: 0, dawn: 3, morning: 1, day: 2, sunset: 3, evening: 4 };
const BLD_IDX: Record<Phase, number> = { night: 0, dawn: 1, morning: 2, day: 2, sunset: 3, evening: 4 };
// solid sky colour filling above the skyline band (blends with the strip top)
const SKY_FILL: Record<Phase, number> = {
  night: 0x121a32, dawn: 0x6f6092, morning: 0x9fc2dd, day: 0x9ec9e8, sunset: 0xc8788c, evening: 0x33406b,
};
// each prop's height as a multiple of the door-height unit + its sidewalk x (0..1)
const PROP_CFG: Record<string, { mult: number; fx: number }> = {
  st_traffic: { mult: 1.9, fx: 0.05 },
  st_lamp: { mult: 2.2, fx: 0.13 },
  st_bike: { mult: 0.9, fx: 0.2 },
  st_sign: { mult: 0.85, fx: 0.36 },
  st_planter: { mult: 0.6, fx: 0.41 },
  st_plant: { mult: 0.55, fx: 0.56 },
  st_bench: { mult: 0.72, fx: 0.79 },
  st_mailbox: { mult: 1.05, fx: 0.88 },
  st_vending: { mult: 1.45, fx: 0.95 },
};
const BLD_X = 0.48; // building centre (slightly left to balance the right cluster)

export interface BuildingCallbacks { onEnterFloor?: () => void; }

export function makeBuildingScene(Phaser: typeof import('phaser')) {
  return class BuildingScene extends Phaser.Scene {
    cb: BuildingCallbacks = {};
    env: { phase: Phase; weather: Weather } = { phase: 'day', weather: 'clear' };
    skyFill: any = null;
    sky: any = null;
    sidewalk: any = null;
    road: any = null;
    curb: any = null;
    bld: any = null;
    rain: any = null;
    snow: any = null;
    sun: any = null;
    clouds: any[] = [];
    props: any[] = [];
    cta: any = null;

    constructor() { super('building'); }

    init() {
      this.cb = (this.game.registry.get('cb') as BuildingCallbacks) ?? {};
      this.env = (this.game.registry.get('env') as { phase: Phase; weather: Weather }) ?? this.env;
    }

    preload() {
      if (!this.textures.exists('ext')) this.load.atlas('ext', `${ATLAS}/exterior.png`, `${ATLAS}/exterior.json`);
    }

    create() {
      this.cameras.main.setBackgroundColor('#0d1322');
      this.skyFill = this.add.rectangle(0, 0, 10, 10, 0x9ec9e8).setOrigin(0, 0).setScrollFactor(0).setDepth(-2);
      this.sky = this.add.image(0, 0, 'ext', 'sky_2').setOrigin(0.5, 1).setScrollFactor(0).setDepth(0);
      if (this.textures.getFrame('ext', 'sun')) this.sun = this.add.image(0, 0, 'ext', 'sun').setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1);
      ['cloud_a', 'cloud_b', 'cloud_c', 'cloud_d'].filter((n) => this.textures.getFrame('ext', n)).forEach((n, i) => {
        const c = this.add.image(0, 0, 'ext', n).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(6).setAlpha(0.9);
        c.setData('lane', i); c.setData('gray', n); this.clouds.push(c);
      });
      // ground: road (back) + sidewalk + curb highlight
      this.road = this.add.rectangle(0, 0, 10, 10, 0x23262c).setOrigin(0, 0).setScrollFactor(0).setDepth(3);
      this.sidewalk = this.add.rectangle(0, 0, 10, 10, 0x3a3f47).setOrigin(0, 0).setScrollFactor(0).setDepth(4);
      this.curb = this.add.rectangle(0, 0, 10, 3, 0x4c525b).setOrigin(0, 0).setScrollFactor(0).setDepth(4);

      this.bld = this.add.image(0, 0, 'ext', 'bld_2').setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);
      this.bld.setInteractive({ useHandCursor: true });
      this.bld.on('pointerdown', () => this.cb.onEnterFloor?.());
      this.bld.on('pointerover', () => this.cta?.setAlpha(1).setScale(1.06));
      this.bld.on('pointerout', () => this.cta?.setAlpha(0.82).setScale(1));

      for (const name of Object.keys(PROP_CFG)) {
        if (!this.textures.getFrame('ext', name)) continue;
        const p = this.add.image(0, 0, 'ext', name).setOrigin(0.5, 1).setScrollFactor(0).setDepth(name === 'st_lamp' || name === 'st_traffic' ? 9 : 12);
        p.setData('cfg', PROP_CFG[name]); this.props.push(p);
      }

      this.rain = this.add.tileSprite(0, 0, 10, 10, 'ext', 'rain_panel').setOrigin(0, 0).setScrollFactor(0).setDepth(40).setAlpha(0.5).setVisible(false);
      this.snow = this.add.tileSprite(0, 0, 10, 10, 'ext', 'snow_panel').setOrigin(0, 0).setScrollFactor(0).setDepth(40).setAlpha(0.65).setVisible(false);

      this.cta = this.add.text(0, 0, '▸ Enter the Lab', {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12px', color: '#0e1320',
        backgroundColor: '#e9c46a', padding: { x: 6, y: 3 },
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(60).setAlpha(0.82);

      this.relayout();
      this.setEnv(this.env.phase, this.env.weather);
      this.scale.on('resize', () => this.relayout());
    }

    relayout() {
      const w = this.scale.width, h = this.scale.height;
      const baseY = Math.round(h * 0.78);     // shared ground baseline
      const groundH = h - baseY;
      this.skyFill.setPosition(0, 0).setSize(w, baseY + 2);

      // sky/skyline band: uniform cover scale, bottom (railing) at the baseline
      const stripH = h * 0.42;
      const sScale = Math.max(w / this.sky.width, stripH / this.sky.height);
      this.sky.setScale(sScale).setPosition(w / 2, baseY + 1);

      // ground bands
      this.road.setPosition(0, baseY + groundH * 0.62).setSize(w, groundH * 0.38);
      this.sidewalk.setPosition(0, baseY).setSize(w, groundH * 0.62);
      this.curb.setPosition(0, baseY).setSize(w, 3);

      // building grounded on the baseline, door-height unit drives prop scale
      const bScale = (h * 0.52) / this.bld.height;
      this.bld.setScale(bScale).setPosition(w * BLD_X, baseY + 1);
      const unit = this.bld.displayHeight * 0.22; // ≈ door height

      this.props.forEach((p) => {
        const { mult, fx } = p.getData('cfg');
        p.setScale((unit * mult) / p.height).setPosition(w * fx, baseY + Math.round(groundH * 0.12));
      });

      // sky elements (modest, above the skyline band)
      this.sun?.setScale((unit * 1.0) / this.sun.height).setPosition(w * 0.76, h * 0.16);
      this.clouds.forEach((c, i) => c.setScale((w * 0.2) / c.width).setPosition(w * (0.18 + i * 0.22), h * (0.12 + (i % 2) * 0.08)));
      this.rain.setSize(w, h); this.snow.setSize(w, h);

      // CTA at the door (lower third of the facade)
      this.cta.setPosition(w * BLD_X, baseY - this.bld.displayHeight * 0.16);
    }

    setEnv(phase: Phase, weather: Weather) {
      this.env = { phase, weather };
      if (!this.sky) return;
      const sky = `sky_${SKY_IDX[phase] ?? 2}`, bld = `bld_${BLD_IDX[phase] ?? 2}`;
      if (this.textures.getFrame('ext', sky)) this.sky.setTexture('ext', sky);
      if (this.textures.getFrame('ext', bld)) this.bld.setTexture('ext', bld);
      this.skyFill.setFillStyle(SKY_FILL[phase] ?? 0x9ec9e8, 1);
      this.relayout();

      const night = phase === 'night' || phase === 'evening';
      if (this.sun && this.textures.getFrame('ext', night ? 'moon' : 'sun')) this.sun.setTexture('ext', night ? 'moon' : 'sun');
      this.rain.setVisible(weather === 'rain');
      this.snow.setVisible(weather === 'snow');
      const fair = weather === 'clear';
      this.clouds.forEach((c) => {
        const tex = fair ? 'wcloud' : c.getData('gray');
        if (this.textures.getFrame('ext', tex)) c.setTexture('ext', tex);
        c.setVisible(true);
      });
    }

    update(_t: number, dt: number) {
      if (this.rain.visible) this.rain.tilePositionY -= dt * 0.9;
      if (this.snow.visible) { this.snow.tilePositionY -= dt * 0.18; this.snow.tilePositionX += dt * 0.04; }
      const w = this.scale.width;
      for (const c of this.clouds) {
        c.x += dt * 0.006 * (1 + (c.getData('lane') % 2) * 0.4);
        if (c.x - c.displayWidth / 2 > w) c.x = -c.displayWidth / 2;
      }
    }
  };
}
