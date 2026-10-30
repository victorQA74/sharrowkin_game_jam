import { describe, it, expect } from 'vitest';
import { createGame, update, spinWeb, isHidden, WORLD, GOAL } from './game';

describe('night shift rules', () => {
  it('starts a fresh run without shared state', () => {
    const a = createGame(); a.health = 1; a.webs.push({ x: 1, y: 1, life: 2 });
    const b = createGame(); expect(b.health).toBe(3); expect(b.webs).toHaveLength(0); expect(b.score).toBe(0);
  });
  it('normalizes diagonal movement and clamps room boundaries', () => {
    const a = createGame(), b = createGame();
    update(a, 0.1, { x: 1, y: 0 }, () => 0.5); update(b, 0.1, { x: 1, y: 1 }, () => 0.5);
    expect(Math.hypot(b.player.x - 145, b.player.y - 395)).toBeCloseTo(a.player.x - 145);
    a.player.x = WORLD.w - 22; update(a, 0.1, { x: 1, y: 0 }); expect(a.player.x).toBeLessThanOrEqual(WORLD.w - 22);
  });
  it('allows hiding only inside furniture', () => {
    const s = createGame(); expect(isHidden(s)).toBe(true);
    s.player = { x: 600, y: 250 }; expect(isHidden(s)).toBe(false);
  });
  it('spends silk, prevents repeat fire and regenerates silk', () => {
    const s = createGame(); expect(spinWeb(s)).toBe(true); expect(s.silk).toBe(2);
    expect(spinWeb(s)).toBe(false); update(s, 0.1, { x: 0, y: 0 });
    s.silk = 0; s.cooldown = 0; expect(spinWeb(s)).toBe(false);
    for (let i = 0; i < 71; i++) update(s, 0.1, { x: 0, y: 0 }, () => 0.5);
    expect(s.silk).toBeGreaterThanOrEqual(1);
  });
  it('catches a fly in a web and wins only after returning home', () => {
    const s = createGame(); s.score = GOAL - 1; s.player = { x: 500, y: 300 };
    s.flies = [{ x: 500, y: 300, angle: 0, phase: 0 }]; s.webs = [{ x: 500, y: 300, life: 5 }];
    update(s, 0.01, { x: 0, y: 0 }, () => 0.5); expect(s.score).toBe(GOAL); expect(s.status).toBe('playing');
    s.player = { x: 145, y: 395 }; update(s, 0.01, { x: 0, y: 0 }); expect(s.status).toBe('won');
  });
  it('telegraphs a strike, hurts only once, and can be dodged', () => {
    const s = createGame(); s.player = { x: 600, y: 300 }; s.strike = { x: 600, y: 300, timer: 0.05, hit: false };
    update(s, 0.1, { x: 0, y: 0 }); expect(s.health).toBe(2);
    update(s, 0.1, { x: 0, y: 0 }); expect(s.health).toBe(2);
    s.invincible = 0; s.strike = { x: 700, y: 300, timer: 0.05, hit: false };
    update(s, 0.1, { x: 0, y: 0 }); expect(s.health).toBe(2);
  });
  it('ends on timeout or zero health and never advances a finished run', () => {
    const s = createGame(); s.time = 0.05; update(s, 0.1, { x: 0, y: 0 }); expect(s.status).toBe('lost');
    const time = s.elapsed; update(s, 0.1, { x: 1, y: 0 }); expect(s.elapsed).toBe(time); expect(spinWeb(s)).toBe(false);
    const b = createGame(); b.health = 0; update(b, 0.01, { x: 0, y: 0 }); expect(b.status).toBe('lost');
  });
});
