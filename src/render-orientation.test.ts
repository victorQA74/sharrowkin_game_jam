import { describe, expect, it } from 'vitest';
import { createGame, type Point } from './game';
import { draw } from './render';

type Pose = { origin: Point; angle: number; sx: number; sy: number };
type Hand = { centre: Point; thumb: Point; nails: number };

// Observe the real renderer's transforms and nails, not its mirror argument.
function observeHands() {
  let pose: Pose = { origin: { x: 0, y: 0 }, angle: 0, sx: 1, sy: 1 };
  const stack: Pose[] = [], hands: Hand[] = [];
  let hand: Hand | null = null;
  const noop = () => undefined;
  const project = (x: number, y: number): Point => ({
    x: pose.origin.x + Math.cos(pose.angle) * x * pose.sx - Math.sin(pose.angle) * y * pose.sy,
    y: pose.origin.y + Math.sin(pose.angle) * x * pose.sx + Math.cos(pose.angle) * y * pose.sy,
  });
  const target: Record<string, unknown> = {
    canvas: { width: 1000, height: 600 },
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 100 }),
    save: () => { stack.push(structuredClone(pose)); },
    restore: () => { pose = stack.pop()!; },
    translate: (x: number, y: number) => { pose = { ...pose, origin: project(x, y) }; },
    rotate: (angle: number) => { pose.angle += angle; },
    scale: (sx: number, sy: number) => { pose.sx *= sx; pose.sy *= sy; },
    roundRect: (_x: number, _y: number, w: number, h: number) => {
      if (w === 38 && h === 38) {
        hand = { centre: project(0, 0), thumb: { x: NaN, y: NaN }, nails: 0 };
      }
    },
    ellipse: (x: number, y: number) => {
      if (target.fillStyle !== '#f3d6c4' || !hand) return;
      hand.nails++;
      if (hand.nails === 5) {
        hand.thumb = project(x, y);
        hands.push(hand);
        hand = null;
      }
    },
  };
  return {
    ctx: new Proxy(target, { get: (o, key: string) => key in o ? o[key] : noop }) as unknown as CanvasRenderingContext2D,
    hands,
  };
}

function signedThumbSide(hand: Hand, wrist: Point): number {
  const fx = hand.centre.x - wrist.x, fy = hand.centre.y - wrist.y;
  const tx = hand.thumb.x - hand.centre.x, ty = hand.thumb.y - hand.centre.y;
  return fx * ty - fy * tx;
}

function expectBacksUp(hands: Hand[]) {
  expect(hands).toHaveLength(2);
  expect(hands.map(hand => hand.nails)).toEqual([5, 5]);
  // Human faces left: upper (right) hand's thumb is below the wrist/fingers axis;
  // lower (left) hand's thumb is above it. Palm-up hands reverse both sides.
  expect(signedThumbSide(hands[0], { x: 1040, y: 185 })).toBeLessThan(0);
  expect(signedThumbSide(hands[1], { x: 1010, y: 400 })).toBeGreaterThan(0);
}

describe('human hands face the floor', () => {
  it('shows both backs with thumbs towards the body at rest, wind-up, impact and recovery', () => {
    for (const timer of [null, 0.95, 0.5, 0, -0.2, -0.5]) {
      const g = createGame(), observed = observeHands();
      if (timer !== null) g.strike = { x: 600, y: 380, timer, hit: timer <= 0 };
      const before = structuredClone(g);
      draw(observed.ctx, g, { t: 1, target: null, best: 0 });
      expectBacksUp(observed.hands);
      expect(g).toEqual(before);
    }
  });

  it('keeps the backs facing up on frozen victory and defeat frames', () => {
    for (const status of ['won', 'lost'] as const) {
      const g = createGame(), observed = observeHands();
      g.status = status;
      g.strike = { x: 600, y: 380, timer: -0.2, hit: true };
      const before = structuredClone(g);
      draw(observed.ctx, g, { t: 1, target: null, best: 0 });
      expectBacksUp(observed.hands);
      expect(g).toEqual(before);
    }
  });
});
