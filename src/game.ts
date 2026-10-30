export const WORLD = { w: 1000, h: 600 };
export const GOAL = 8;
export const DURATION = 120;
export type Point = { x: number; y: number };
export const SHELTERS = [
  { x: 75, y: 330, w: 140, h: 130, label: 'ГНЕЗДО', home: true },
  { x: 420, y: 110, w: 150, h: 100, label: 'ПОД СТОЛОМ', home: false },
  { x: 760, y: 395, w: 155, h: 110, label: 'ПОД ШКАФОМ', home: false },
];
export type Fly = Point & { angle: number; phase: number };
export type Web = Point & { life: number };
export type Strike = Point & { timer: number; hit: boolean };
export type Particle = Point & { vx: number; vy: number; life: number; color: string };
export type Game = {
  player: Point; facing: number; health: number; score: number; silk: number; silkClock: number;
  cooldown: number; elapsed: number; time: number; suspicion: number; invincible: number;
  status: 'playing' | 'won' | 'lost'; reason: string; flies: Fly[]; webs: Web[];
  light: Point; strike: Strike | null; strikeClock: number; particles: Particle[]; catches: number;
};
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function createGame(): Game {
  return {
    player: { x: 145, y: 395 }, facing: 0, health: 3, score: 0, silk: 3, silkClock: 0,
    cooldown: 0, elapsed: 0, time: DURATION, suspicion: 0, invincible: 0, status: 'playing', reason: '',
    flies: Array.from({ length: 12 }, (_, i) => ({ x: 260 + (i % 4) * 155, y: 200 + Math.floor(i / 4) * 130, angle: i * 2.4, phase: i * 1.7 })),
    webs: [], light: { x: 800, y: 200 }, strike: null, strikeClock: 3, particles: [], catches: 0,
  };
}
export function isHidden(s: Game): boolean {
  return SHELTERS.some(r => s.player.x > r.x && s.player.x < r.x + r.w && s.player.y > r.y && s.player.y < r.y + r.h);
}
export function atHome(s: Game): boolean {
  const h = SHELTERS[0];
  return s.player.x > h.x && s.player.x < h.x + h.w && s.player.y > h.y && s.player.y < h.y + h.h;
}
export function spinWeb(s: Game): boolean {
  if (s.status !== 'playing' || s.silk < 1 || s.cooldown > 0) return false;
  s.webs.push({ ...s.player, life: 13 }); s.silk--; s.cooldown = 0.45;
  return true;
}
function burst(s: Game, p: Point, color: string, random: () => number) {
  for (let i = 0; i < 12; i++) {
    const a = random() * Math.PI * 2, v = 25 + random() * 90;
    s.particles.push({ ...p, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.8, color });
  }
}
// dt is bounded: switching tabs must not produce instant damage or a timeout.
export function update(s: Game, dt: number, input: Point, random: () => number = Math.random): void {
  if (s.status !== 'playing') return;
  dt = clamp(dt, 0, 0.1); s.elapsed += dt; s.time = Math.max(0, s.time - dt);
  s.cooldown = Math.max(0, s.cooldown - dt); s.invincible = Math.max(0, s.invincible - dt);
  s.silkClock += dt;
  if (s.silkClock >= 4) { s.silk = Math.min(3, s.silk + 1); s.silkClock -= 4; }
  const mag = Math.hypot(input.x, input.y);
  if (mag > 0) {
    const scale = Math.min(1, mag) / mag;
    s.player.x = clamp(s.player.x + input.x * scale * 205 * dt, 22, WORLD.w - 22);
    s.player.y = clamp(s.player.y + input.y * scale * 205 * dt, 55, WORLD.h - 22);
    s.facing = Math.atan2(input.y, input.x);
  }
  const hidden = isHidden(s);
  const patrol = { x: 500 + Math.sin(s.elapsed * 0.43) * 345, y: 305 + Math.sin(s.elapsed * 0.71 + 1) * 185 };
  const target = s.suspicion > 0.25 && !hidden ? s.player : patrol;
  s.light.x += (target.x - s.light.x) * dt * 1.2;
  s.light.y += (target.y - s.light.y) * dt * 1.2;
  const lit = !hidden && distance(s.player, s.light) < 125;
  s.suspicion = clamp(s.suspicion + dt * (lit ? 0.52 : -0.34), 0, 1);
  s.strikeClock -= dt;
  if (!s.strike && !hidden && (s.suspicion >= 0.95 || s.strikeClock <= 0)) {
    s.strike = { ...s.player, timer: 0.95, hit: false }; s.strikeClock = 5.5; s.suspicion *= 0.4;
  }
  if (s.strike) {
    s.strike.timer -= dt;
    if (s.strike.timer <= 0 && !s.strike.hit) {
      s.strike.hit = true;
      if (!hidden && distance(s.player, s.strike) < 76 && s.invincible <= 0) {
        s.health--; s.invincible = 1.5; burst(s, s.player, '#fa7667', random);
      }
    }
    if (s.strike.timer < -0.5) s.strike = null;
  }
  for (const web of s.webs) web.life -= dt;
  s.webs = s.webs.filter(w => w.life > 0);
  for (const fly of s.flies) {
    fly.angle += Math.sin(s.elapsed * 1.9 + fly.phase) * dt * 2;
    fly.x += Math.cos(fly.angle) * 39 * dt; fly.y += Math.sin(fly.angle) * 39 * dt;
    if (fly.x < 235 || fly.x > 950) { fly.angle = Math.PI - fly.angle; fly.x = clamp(fly.x, 235, 950); }
    if (fly.y < 80 || fly.y > 555) { fly.angle = -fly.angle; fly.y = clamp(fly.y, 80, 555); }
    if (s.webs.some(w => distance(w, fly) < 58)) {
      s.score++; s.catches++; burst(s, fly, '#c9ed9e', random);
      fly.x = 260 + random() * 650; fly.y = 90 + random() * 440; fly.angle = random() * Math.PI * 2;
    }
  }
  for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  s.particles = s.particles.filter(p => p.life > 0);
  if (s.health <= 0 || s.time <= 0) {
    s.status = 'lost'; s.reason = s.health <= 0 ? 'Тапок оказался быстрее. В следующий раз — рывок в сторону!' : 'Наступило утро. Человек проснулся, а ужин ещё не собран.';
  } else if (s.score >= GOAL && atHome(s)) s.status = 'won';
}
