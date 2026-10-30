import { WORLD, type Point } from './game';

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

// Keyboard (layout independent), plus mouse/touch: press or drag sets a destination in the room.
export function createInput(canvas: HTMLCanvasElement) {
  const down = new Set<string>();
  let target: Point | null = null;
  let dragging = false;

  window.addEventListener('keydown', e => {
    if (e.code in KEYS) { down.add(e.code); target = null; }
  });
  window.addEventListener('keyup', e => down.delete(e.code));
  window.addEventListener('blur', () => { down.clear(); dragging = false; });

  const toWorld = (e: PointerEvent): Point => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * WORLD.w, y: (e.clientY - r.top) / r.height * WORLD.h };
  };
  canvas.addEventListener('pointerdown', e => {
    dragging = true;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    target = toWorld(e);
  });
  canvas.addEventListener('pointermove', e => { if (dragging) target = toWorld(e); });
  const stop = () => { dragging = false; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  return {
    get target(): Point | null { return target; },
    reset(): void { down.clear(); target = null; dragging = false; },
    vector(p: Point): Point {
      let x = 0, y = 0;
      for (const code of down) { x += KEYS[code][0]; y += KEYS[code][1]; }
      if (x || y) return { x, y };
      if (!target) return { x: 0, y: 0 };
      const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy);
      if (d < 10) { if (!dragging) target = null; return { x: 0, y: 0 }; }
      const k = Math.min(1, d / 40) / d;
      return { x: dx * k, y: dy * k };
    },
  };
}
