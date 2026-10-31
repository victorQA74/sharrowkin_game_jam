import { describe, expect, it } from 'vitest';
import { createGame, GOAL, HAND, update, type Game } from './game';
import { draw } from './render';

// Observe drawing commands, without replacing the model or animation rules.
// Browser verification is still required for silhouettes and old pixel trails.
function recordingCanvas() {
  const calls: string[] = [];
  let palms = 0, forearms = 0, palmPath = false, scale = 1;
  const palmScales: number[] = [];
  const noop = () => undefined;
  const target: Record<string, unknown> = {
    canvas: { width: 1000, height: 600 },
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 100 }),
    beginPath: () => { palmPath = false; },
    roundRect: (_x: number, _y: number, w: number, h: number) => {
      palmPath = w === 38 && h === 38;
    },
    scale: (x: number) => { scale = Math.abs(x); },
    fill: () => {
      if (palmPath) { palms++; palmScales.push(scale); calls.push('palm'); }
      if (target.fillStyle === '#7a4f3a' || target.fillStyle === '#a56d4f') calls.push('slipper');
    },
    stroke: () => { if (target.lineWidth === 28) forearms++; },
    clearRect: () => { calls.push('clear'); },
    translate: () => { calls.push('translate'); },
    fillRect: () => { calls.push('background'); },
  };
  const ctx = new Proxy(target, {
    get: (o, key: string) => key in o ? o[key] : noop,
  }) as unknown as CanvasRenderingContext2D;
  return {
    ctx, calls,
    reset() { calls.length = 0; palms = 0; forearms = 0; palmScales.length = 0; },
    counts: () => ({ palms, forearms }),
    palmScales,
  };
}
const ZERO = { x: 0, y: 0 };
const rng = () => 0.5;

function checkFrame(g: Game, canvas: ReturnType<typeof recordingCanvas>) {
  const before = structuredClone(g);
  canvas.reset();
  draw(canvas.ctx, g, { t: g.elapsed, target: null, best: 0 });
  expect(canvas.counts()).toEqual({ palms: 2, forearms: 2 });
  expect(canvas.palmScales).toEqual([1.15, 1.15]);
  // Both slipper layers must be underneath the attacking palm in every pose.
  expect(canvas.calls.filter(call => call === 'palm' || call === 'slipper')).toEqual(
    g.strike ? ['palm', 'slipper', 'slipper', 'palm'] : ['palm', 'palm'],
  );
  expect(g).toEqual(before);
}

describe('published two-hand renderer regression', () => {
  it('keeps exactly two hands and the correct layers throughout real strike cycles', () => {
    const g = createGame(), canvas = recordingCanvas();
    checkFrame(g, canvas);
    g.player = { x: 600, y: 380 };
    g.health = 99; g.strikeClock = 0;
    let attacks = 0, impacts = 0, recoveries = 0, completions = 0;
    let previous: Game['strike'] = null;
    for (let frame = 0; frame < 60 * 18; frame++) {
      const hadStrike = previous !== null;
      const hadHit = previous?.hit ?? false;
      update(g, 1 / 60, ZERO, rng);
      if (!hadStrike && g.strike) attacks++;
      if (!hadHit && g.strike?.hit) impacts++;
      if (g.strike?.hit) recoveries++;
      if (hadStrike && !g.strike) completions++;
      checkFrame(g, canvas);
      previous = g.strike ? { ...g.strike } : null;
    }
    expect(attacks).toBeGreaterThanOrEqual(3);
    expect(impacts).toBeGreaterThanOrEqual(3);
    expect(recoveries).toBeGreaterThan(30);
    expect(completions).toBeGreaterThanOrEqual(3);
  }, 30_000);

  it('keeps two hands at phase boundaries, paused and lost frames, and restart', () => {
    const canvas = recordingCanvas();
    for (const [timer, hit] of [[0.95, false], [0.001, false], [0, true], [-0.499, true], [-0.5, true]] as const) {
      const g = createGame();
      g.strike = { x: 600, y: 380, timer, hit };
      checkFrame(g, canvas);
      checkFrame(g, canvas); // paused: identical model, no update
      g.status = 'lost';
      checkFrame(g, canvas);
      checkFrame(createGame(), canvas);
    }
  });

  it('preserves both hands when the winning bite occurs during a strike', () => {
    const g = createGame(), canvas = recordingCanvas();
    g.score = GOAL; g.player = { x: HAND.x, y: HAND.y };
    g.strike = { ...g.player, timer: 0.6, hit: false };
    for (let i = 0; i < 70; i++) {
      update(g, 1 / 60, ZERO, rng);
      checkFrame(g, canvas);
    }
    expect(g.status).toBe('won');
    checkFrame(createGame(), canvas);
  });

  it('clears the previous frame before moving any hands on consecutive draws', () => {
    const canvas = recordingCanvas(), g = createGame();
    for (let i = 0; i < 3; i++) {
      checkFrame(g, canvas);
      expect(canvas.calls.slice(0, 2)).toEqual(['clear', 'background']);
      expect(canvas.calls.indexOf('translate')).toBeGreaterThan(1);
    }
  });
});
