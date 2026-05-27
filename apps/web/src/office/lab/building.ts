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
    fog: any = null;
    refl: any = null;
    reflMask: any = null;
    shadow: any = null;
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
      // ── blend layers so the building sits IN the scene, not on top of it ──
      this.ensureFxTextures();
      // back-fog: faint blue-grey haze between the far backdrop and the building
      this.fog = this.add.image(0, 0, 'bld-fog').setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(3);
      // wet-floor reflection: the building flipped + faded by a gradient mask
      this.reflMask = this.add.image(0, 0, 'refl-grad').setOrigin(0.5, 0).setScrollFactor(0).setVisible(false);
      this.refl = this.add.image(0, 0, `bld-${bld}`).setOrigin(0.5, 0).setFlipY(true).setScrollFactor(0)
        .setDepth(2).setAlpha(0.17).setTint(0x93a1b2);
      this.refl.setMask(this.reflMask.createBitmapMask());
      // the building, grounded on the sidewalk
      this.bld = this.add.image(0, 0, `bld-${bld}`).setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);
      this.bld.setTint(0xdfe6ee); // subtle cool-grey weather grade (less stark vs hazy bg)
      this.bld.setInteractive({ useHandCursor: true });
      this.bld.on('pointerdown', () => this.cb.onEnterFloor?.());
      this.bld.on('pointerover', () => this.cta?.setAlpha(0.95).setScale(1.04));
      this.bld.on('pointerout', () => this.cta?.setAlpha(0.45).setScale(1));
      // soft flat contact shadow at the base (slight, not photoreal)
      this.shadow = this.add.image(0, 0, 'contact-shadow').setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(8);
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

    ensureFxTextures() {
      if (!this.textures.exists('contact-shadow')) {
        const g = this.make.graphics();
        const RW = 220, RH = 64; // stacked ellipses → soft radial alpha (no heavy blur)
        for (let i = 12; i >= 1; i--) { g.fillStyle(0x0a0e16, 0.085); g.fillEllipse(RW / 2, RH / 2, RW * (i / 12), RH * (i / 12)); }
        g.generateTexture('contact-shadow', RW, RH); g.destroy();
      }
      if (!this.textures.exists('bld-fog')) {
        const g = this.make.graphics();
        g.fillGradientStyle(0xb4c2d0, 0xb4c2d0, 0xb4c2d0, 0xb4c2d0, 0.24, 0.24, 0.02, 0.02);
        g.fillRect(0, 0, 64, 64); g.generateTexture('bld-fog', 64, 64); g.destroy();
      }
      if (!this.textures.exists('refl-grad')) {
        const g = this.make.graphics();
        g.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.5, 0.5, 0, 0);
        g.fillRect(0, 0, 64, 128); g.generateTexture('refl-grad', 64, 128); g.destroy();
      }
    }

    relayout() {
      const w = this.scale.width, h = this.scale.height;
      // cover the screen with the backdrop; ground/sidewalk at the bottom
      if (this.bg?.width) {
        const s = Math.max(w / this.bg.width, h / this.bg.height);
        this.bg.setScale(s).setPosition(w / 2, h + 1);
      }
      // building grounded on the sidewalk (~0.62 of screen height, +4% so it sits firmly)
      if (this.bld?.width) {
        const bScale = ((h * 0.62) / this.bld.height) * 1.04;
        this.bld.setScale(bScale).setPosition(w * 0.5, h * 0.93);
        const bx = w * 0.5, baseY = h * 0.93, bw = this.bld.displayWidth, bh = this.bld.displayHeight;
        this.cta.setPosition(bx, baseY - bh * 0.08);
        this.fog?.setDisplaySize(bw * 1.4, bh * 0.78).setPosition(bx, baseY - bh * 0.5);
        // contact shadow: wider than the base + centred ON the baseline so it
        // clearly spreads onto the sidewalk (lower half visible below the building)
        this.shadow?.setDisplaySize(bw * 1.05, Math.max(24, bh * 0.08)).setPosition(bx, baseY + 2);
        if (this.refl) {
          // short reflection so it fits the visible ground strip below the base
          this.refl.setScale(this.bld.scaleX, this.bld.scaleY * 0.22).setPosition(bx, baseY);
          this.reflMask.setDisplaySize(this.refl.displayWidth, this.refl.displayHeight).setPosition(bx, baseY);
        }
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
        if (this.textures.exists(bldK)) { this.bld.setTexture(bldK); this.refl?.setTexture(bldK); }
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
