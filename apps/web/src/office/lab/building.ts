/**
 * Yule Agent Lab — the Building (exterior) Phaser scene, built on the new-motion
 * assets. One cohesive street scene:
 *   • a full city BACKDROP (new-motion/backgrounds) cover-fitted to the screen,
 *     ground/sidewalk at the bottom — never cropped to fake cloud motion;
 *   • the Yule Studio BUILDING (new-motion/buildings) standing on that sidewalk;
 *   • a separate weather overlay — small drifting cloud sprites + rain/snow
 *     particles (new-motion/weather).
 * Background + building swap together by KST time-of-day / weather and are
 * lazy-loaded per phase (the source images are large). No street props.
 * Phaser is injected (SSR-safe).
 */
import type { Phase, Weather } from '@/office/useKst';

const NM = '/assets/yule-office/new-motion';
const bgUrl = (n: string) => `${NM}/backgrounds/background-${n}.png`;
const bldUrl = (n: string) => `${NM}/buildings/building-${n}.png`;
const wxUrl = (n: string) => `${NM}/weather/${n}.png`;
const CLOUDS = ['cloud-0', 'cloud-1', 'cloud-2', 'cloud-3'];

/** time-of-day / weather → backdrop + building file stems (from new-motion). */
function assetsFor(phase: Phase, weather: Weather): { bg: string; bld: string } {
  if (weather === 'rain') return { bg: 'rain-night', bld: phase === 'day' || phase === 'morning' ? 'overcast-day' : 'night-lit' };
  if (weather === 'snow') return { bg: 'snow-day', bld: phase === 'night' || phase === 'evening' ? 'snow-night' : 'snow-day' };
  if (weather === 'cloudy') return { bg: 'overcast-day', bld: 'overcast-day' };
  const M: Record<Phase, [string, string]> = {
    dawn: ['dawn-blue', 'clear-day-soft'],
    morning: ['clear-day-soft', 'clear-day-soft'],
    day: ['clear-day-bright', 'clear-day-bright'],
    sunset: ['sunset-orange', 'sunset-orange'],
    evening: ['dusk-violet', 'dusk-violet'],
    night: ['clear-night', 'night-lit'],
  };
  const [bg, bld] = M[phase] ?? M.day;
  return { bg, bld };
}

export interface BuildingCallbacks { onEnterFloor?: () => void; }

export function makeBuildingScene(Phaser: typeof import('phaser')) {
  return class BuildingScene extends Phaser.Scene {
    cb: BuildingCallbacks = {};
    env: { phase: Phase; weather: Weather } = { phase: 'day', weather: 'clear' };
    bg: any = null;
    bld: any = null;
    rain: any = null;
    snow: any = null;
    clouds: any[] = [];
    cta: any = null;

    constructor() { super('building'); }

    init() {
      this.cb = (this.game.registry.get('cb') as BuildingCallbacks) ?? {};
      this.env = (this.game.registry.get('env') as { phase: Phase; weather: Weather }) ?? this.env;
    }

    preload() {
      for (const n of [...CLOUDS, 'rain-streak', 'snow-flake', 'snow-dot']) this.load.image(`wx-${n}`, wxUrl(n));
      const { bg, bld } = assetsFor(this.env.phase, this.env.weather);
      this.load.image(`bg-${bg}`, bgUrl(bg));
      this.load.image(`bld-${bld}`, bldUrl(bld));
    }

    create() {
      this.cameras.main.setBackgroundColor('#0c1018');
      const { bg, bld } = assetsFor(this.env.phase, this.env.weather);
      // backdrop (cover) — ground anchored to screen bottom
      this.bg = this.add.image(0, 0, `bg-${bg}`).setOrigin(0.5, 1).setScrollFactor(0).setDepth(0);
      // drifting cloud sprites (small, behind the building)
      CLOUDS.filter((n) => this.textures.exists(`wx-${n}`)).forEach((n, i) => {
        const c = this.add.image(0, 0, `wx-${n}`).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(5).setAlpha(0.9);
        c.setData('i', i); this.clouds.push(c);
      });
      // the building, grounded on the sidewalk
      this.bld = this.add.image(0, 0, `bld-${bld}`).setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);
      this.bld.setInteractive({ useHandCursor: true });
      this.bld.on('pointerdown', () => this.cb.onEnterFloor?.());
      this.bld.on('pointerover', () => this.cta?.setAlpha(0.95).setScale(1.04));
      this.bld.on('pointerout', () => this.cta?.setAlpha(0.45).setScale(1));
      // weather particles (sprite-based), screen-space
      this.rain = this.add.particles(0, 0, 'wx-rain-streak', {
        x: { min: -120, max: 2600 }, y: -40, lifespan: 1100, quantity: 4, frequency: 28,
        speedX: { min: -150, max: -110 }, speedY: { min: 720, max: 920 }, scale: { min: 0.5, max: 0.95 },
        alpha: { start: 0.5, end: 0.38 },
      }).setScrollFactor(0).setDepth(45).setVisible(false);
      this.snow = this.add.particles(0, 0, 'wx-snow-flake', {
        x: { min: -60, max: 2600 }, y: -40, lifespan: 6500, quantity: 2, frequency: 75,
        speedX: { min: -34, max: 34 }, speedY: { min: 45, max: 105 }, scale: { min: 0.28, max: 0.6 },
        alpha: { start: 0.92, end: 0.7 }, rotate: { min: 0, max: 360 },
      }).setScrollFactor(0).setDepth(45).setVisible(false);
      // CTA at the door
      // subtle hint near the door — quiet by default, brightens on hover
      this.cta = this.add.text(0, 0, 'Enter ▸', {
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '11px', color: '#e6e9ef',
        backgroundColor: 'rgba(12,16,26,0.5)', padding: { x: 6, y: 2 },
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(60).setAlpha(0.45);

      this.relayout();
      this.applyWeather();
      this.scale.on('resize', () => this.relayout());
    }

    relayout() {
      const w = this.scale.width, h = this.scale.height;
      // cover the screen with the backdrop; ground/sidewalk at the bottom
      if (this.bg?.width) {
        const s = Math.max(w / this.bg.width, h / this.bg.height);
        this.bg.setScale(s).setPosition(w / 2, h + 1);
      }
      // building grounded on the sidewalk (~0.62 of screen height)
      if (this.bld?.width) {
        const bScale = (h * 0.62) / this.bld.height;
        this.bld.setScale(bScale).setPosition(w * 0.5, h * 0.93);
        this.cta.setPosition(w * 0.5, h * 0.93 - this.bld.displayHeight * 0.08);
      }
      // clouds in the upper sky, varied size
      const sizes = [0.13, 0.08, 0.07, 0.1];
      this.clouds.forEach((c) => {
        const i = c.getData('i');
        c.setScale((w * sizes[i % sizes.length]) / c.width).setPosition(w * (0.18 + i * 0.22), h * (0.1 + (i % 2) * 0.08));
      });
    }

    applyWeather() {
      this.rain?.setVisible(this.env.weather === 'rain');
      this.snow?.setVisible(this.env.weather === 'snow');
      const cloudy = this.env.weather === 'cloudy' || this.env.weather === 'rain';
      this.clouds.forEach((c) => c.setAlpha(cloudy ? 1 : 0.85));
    }

    setEnv(phase: Phase, weather: Weather) {
      this.env = { phase, weather };
      if (!this.bg) return; // not booted
      const { bg, bld } = assetsFor(phase, weather);
      const bgK = `bg-${bg}`, bldK = `bld-${bld}`;
      const apply = () => {
        if (this.textures.exists(bgK)) this.bg.setTexture(bgK);
        if (this.textures.exists(bldK)) this.bld.setTexture(bldK);
        this.relayout();
        this.applyWeather();
      };
      const need: [string, string][] = [];
      if (!this.textures.exists(bgK)) need.push([bgK, bgUrl(bg)]);
      if (!this.textures.exists(bldK)) need.push([bldK, bldUrl(bld)]);
      if (need.length) {
        for (const [k, u] of need) this.load.image(k, u);
        this.load.once('complete', apply);
        this.load.start();
      } else apply();
    }

    update(_t: number, dt: number) {
      const w = this.scale.width;
      for (const c of this.clouds) {
        c.x += dt * 0.006 * (1 + (c.getData('i') % 2) * 0.5);
        if (c.x - c.displayWidth / 2 > w) c.x = -c.displayWidth / 2;
      }
    }
  };
}
