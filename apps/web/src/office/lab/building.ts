/**
 * Yule Agent Lab — the Building (exterior) Phaser scene.
 *
 * Renders the real time-of-day sprites from the exterior atlas: a full-screen
 * sky+skyline per KST phase, the "Yule Studio" facade grounded on a street with
 * lamps / bench / planter / vending, and sprite-based weather (scrolling rain /
 * snow tile panels + drifting cloud sprites). Clicking the building enters the
 * Floor view. Phaser is injected (never imported here) so SSR stays clean.
 */
import type { Phase, Weather } from '@/office/useKst';

const ATLAS = '/assets/yule-office/atlas';
// 6 KST phases → the 5 baked moods (sky_0..4 / bld_0..4)
const SKY_IDX: Record<Phase, number> = { night: 0, dawn: 3, morning: 1, day: 2, sunset: 3, evening: 4 };
const BLD_IDX: Record<Phase, number> = { night: 0, dawn: 1, morning: 2, day: 2, sunset: 3, evening: 4 };

export interface BuildingCallbacks {
  onEnterFloor?: () => void;
}

export function makeBuildingScene(Phaser: typeof import('phaser')) {
  return class BuildingScene extends Phaser.Scene {
    cb: BuildingCallbacks = {};
    env: { phase: Phase; weather: Weather } = { phase: 'day', weather: 'clear' };
    sky: any = null;
    ground: any = null;
    bld: any = null;
    rain: any = null;
    snow: any = null;
    sun: any = null;
    clouds: any[] = [];
    props: any[] = [];
    hint: any = null;

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
      this.sky = this.add.image(0, 0, 'ext', 'sky_2').setOrigin(0, 0).setScrollFactor(0).setDepth(0);
      this.ground = this.add.rectangle(0, 0, 10, 10, 0x2b2f36).setOrigin(0, 0).setScrollFactor(0).setDepth(5);
      this.bld = this.add.image(0, 0, 'ext', 'bld_2').setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);
      this.bld.setInteractive({ useHandCursor: true });
      this.bld.on('pointerdown', () => this.cb.onEnterFloor?.());

      for (const name of ['st_lamp', 'st_bench', 'st_planter', 'st_vending', 'st_bike', 'st_traffic', 'st_mailbox', 'st_plant']) {
        if (this.textures.getFrame('ext', name)) this.props.push(this.add.image(0, 0, 'ext', name).setOrigin(0.5, 1).setScrollFactor(0).setDepth(11));
      }

      // weather: scrolling rain/snow tile panels (sprite-based) + drifting clouds
      this.rain = this.add.tileSprite(0, 0, 10, 10, 'ext', 'rain_panel').setOrigin(0, 0).setScrollFactor(0).setDepth(40).setAlpha(0.5).setVisible(false);
      this.snow = this.add.tileSprite(0, 0, 10, 10, 'ext', 'snow_panel').setOrigin(0, 0).setScrollFactor(0).setDepth(40).setAlpha(0.65).setVisible(false);
      // sun by day / moon at night, in the sky
      if (this.textures.getFrame('ext', 'sun')) this.sun = this.add.image(0, 0, 'ext', 'sun').setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(7);
      const cloudNames = ['cloud_a', 'cloud_b', 'cloud_c', 'cloud_d'].filter((n) => this.textures.getFrame('ext', n));
      cloudNames.forEach((n, i) => {
        const c = this.add.image(0, 0, 'ext', n).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(8).setAlpha(0.85);
        c.setData('lane', i); c.setData('gray', n); this.clouds.push(c);
      });

      this.hint = this.add.text(0, 0, '▸ Enter the Lab', {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#e8ecf3',
        backgroundColor: 'rgba(20,23,29,0.8)', padding: { x: 8, y: 4 },
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(60);

      this.relayout();
      this.setEnv(this.env.phase, this.env.weather);
      this.scale.on('resize', () => this.relayout());
    }

    relayout() {
      const w = this.scale.width, h = this.scale.height;
      const groundY = h * 0.78;
      this.sky.setDisplaySize(w, groundY + 2);
      this.ground.setPosition(0, groundY).setSize(w, h - groundY);
      // building grounded on the sidewalk, ~55% of the height
      const bh = h * 0.56;
      this.bld.setPosition(w / 2, groundY + 6).setScale(bh / this.bld.height);
      // street props spread along the sidewalk
      const slots = [0.12, 0.78, 0.26, 0.88, 0.06, 0.94, 0.7, 0.34];
      this.props.forEach((p, i) => {
        const sc = Phaser.Math.Clamp((h * 0.16) / p.height, 0.2, 0.9);
        p.setPosition(w * (slots[i] ?? 0.5), groundY + 10).setScale(sc);
      });
      this.rain.setSize(w, h); this.snow.setSize(w, h);
      this.clouds.forEach((c, i) => c.setPosition(w * (0.2 + i * 0.22), h * (0.12 + (i % 2) * 0.1)).setScale(Phaser.Math.Clamp(w / 1400, 0.6, 1.4)));
      this.sun?.setPosition(w * 0.82, h * 0.16).setScale(Phaser.Math.Clamp(w / 1500, 0.7, 1.5));
      this.hint.setPosition(w / 2, groundY - bh - 14);
    }

    setEnv(phase: Phase, weather: Weather) {
      this.env = { phase, weather };
      if (!this.sky) return; // not booted yet (create() builds the scene)
      const sky = `sky_${SKY_IDX[phase] ?? 2}`, bld = `bld_${BLD_IDX[phase] ?? 2}`;
      if (this.textures.getFrame('ext', sky)) this.sky.setTexture('ext', sky);
      if (this.textures.getFrame('ext', bld)) this.bld.setTexture('ext', bld);
      this.relayout();
      const night = phase === 'night' || phase === 'evening';
      if (this.sun && this.textures.getFrame('ext', night ? 'moon' : 'sun')) this.sun.setTexture('ext', night ? 'moon' : 'sun');
      this.rain.setVisible(weather === 'rain');
      this.snow.setVisible(weather === 'snow');
      // clear sky → white fair-weather clouds; otherwise grey weather clouds
      const fair = weather === 'clear';
      this.clouds.forEach((c) => {
        c.setVisible(true);
        const tex = fair ? 'wcloud' : c.getData('gray');
        if (this.textures.getFrame('ext', tex)) c.setTexture('ext', tex);
      });
    }

    update(_t: number, dt: number) {
      if (this.rain.visible) this.rain.tilePositionY -= dt * 0.9;
      if (this.snow.visible) { this.snow.tilePositionY -= dt * 0.18; this.snow.tilePositionX += dt * 0.04; }
      const w = this.scale.width;
      for (const c of this.clouds) {
        if (!c.visible) continue;
        c.x += dt * 0.006 * (1 + (c.getData('lane') % 2) * 0.4);
        if (c.x - c.displayWidth > w) c.x = -c.displayWidth;
      }
    }
  };
}
