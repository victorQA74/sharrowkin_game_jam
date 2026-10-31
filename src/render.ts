import { WORLD, GOAL, DURATION, SHELTERS, HAND, isHidden, type Game, type Point } from './game';

export type View = { t: number; target: Point | null; best: number };

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function room(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  g.addColorStop(0, '#3c3250'); g.addColorStop(1, '#282138');
  ctx.fillStyle = g; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 2;
  for (let x = 0; x <= WORLD.w; x += 100) { ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, WORLD.h); ctx.stroke(); }
  for (let y = 150; y <= WORLD.h; y += 150) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.w, y); ctx.stroke(); }
  ctx.fillStyle = '#3a3050'; ctx.fillRect(0, 0, WORLD.w, 50);
  ctx.fillStyle = '#4b3f63'; ctx.fillRect(0, 46, WORLD.w, 6);
  ctx.fillStyle = '#16213a'; ctx.fillRect(860, 6, 90, 36);
  ctx.fillStyle = '#dfe9ff'; ctx.beginPath(); ctx.arc(915, 24, 8, 0, TAU); ctx.fill();
}

function shelters(ctx: CanvasRenderingContext2D) {
  SHELTERS.forEach((r, i) => {
    if (i === 1) { // table
      ctx.fillStyle = '#6b4a35'; ctx.fillRect(r.x - 14, r.y - 20, r.w + 28, 20);
      ctx.fillRect(r.x - 6, r.y, 10, r.h); ctx.fillRect(r.x + r.w - 4, r.y, 10, r.h);
    } else if (i === 2) { // wardrobe
      ctx.fillStyle = '#4f3a52'; ctx.fillRect(r.x - 6, r.y - 80, r.w + 12, 80);
      ctx.fillStyle = '#3c2b3f'; ctx.fillRect(r.x + r.w / 2 - 1, r.y - 78, 3, 76);
    }
    ctx.fillStyle = r.home ? 'rgba(120,220,120,.16)' : 'rgba(6,4,12,.55)';
    ctx.strokeStyle = r.home ? '#9be564' : '#8d79b0'; ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = r.home ? '#c9ed9e' : '#b7abcb'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(r.label, r.x + r.w / 2, r.y + r.h - 10);
  });
}

function webs(ctx: CanvasRenderingContext2D, g: Game) {
  for (const w of g.webs) {
    ctx.save(); ctx.translate(w.x, w.y); ctx.globalAlpha = Math.min(1, w.life / 2) * 0.85;
    ctx.strokeStyle = '#e6f4ff'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 58, Math.sin(a) * 58); ctx.stroke(); }
    for (const r of [18, 36, 56]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
}

function flies(ctx: CanvasRenderingContext2D, g: Game, t: number) {
  for (const f of g.flies) {
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.angle);
    // A housefly: small dark body, red eyes, two narrow wings swept back (not butterfly-like).
    ctx.fillStyle = 'rgba(201,237,158,.16)'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
    const buzz = Math.sin(t * 70 + f.phase) * 0.16;
    ctx.fillStyle = 'rgba(225,238,255,.55)';
    ctx.beginPath(); ctx.ellipse(-4, -3.5, 6.5, 1.9, -0.55 + buzz, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-4, 3.5, 6.5, 1.9, 0.55 - buzz, 0, TAU); ctx.fill();
    ctx.fillStyle = '#17171b'; ctx.beginPath(); ctx.ellipse(-1, 0, 5.5, 3.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(4, 0, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(5, -1.6, 1.2, 0, TAU); ctx.arc(5, 1.6, 1.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

const SKIN = '#d9a98a', SLEEVE = '#3d4a6b';
const HAND_SCALE = 1.15;
const SHOULDER: Point = { x: 1010, y: 400 };   // the arm that swings the slipper
const RESTING_HAND: Point = { x: 958, y: 409 };
const LAMP: Point = { x: 952, y: 300 };         // headlamp on the human's forehead

function arm(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = SKIN; ctx.lineWidth = 28; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  ctx.strokeStyle = SLEEVE; ctx.lineWidth = 36; ctx.beginPath(); ctx.moveTo(from.x, from.y);
  ctx.lineTo(from.x + (to.x - from.x) * 0.45, from.y + (to.y - from.y) * 0.45); ctx.stroke();
}

const SKIN_EDGE = '#9c6a52', NAIL = '#f3d6c4';

// A human hand seen from above (back of the hand). Local +x points from the wrist to the fingertips;
// `mirror` flips the thumb side so left and right hands look right.
function hand(ctx: CanvasRenderingContext2D, p: Point, angle: number, scale = 1, mirror = 1) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle); ctx.scale(scale, scale * mirror);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // [base y, length, tip y]: index, middle, ring, little finger
  const fingers: [number, number, number][] = [[-13, 30, -17], [-4, 35, -5], [5, 32, 6], [13, 25, 17]];
  const fingerPath = ([y, len, tipY]: [number, number, number]) => { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(12 + len, tipY); };
  const thumbPath = () => { ctx.beginPath(); ctx.moveTo(-4, -14); ctx.quadraticCurveTo(8, -28, 24, -32); };
  const palmPath = () => { ctx.beginPath(); ctx.roundRect(-20, -19, 38, 38, [14, 16, 16, 14]); };
  // outline pass, then skin pass on top, so the shape gets a clean dark edge
  ctx.strokeStyle = SKIN_EDGE;
  ctx.lineWidth = 12.5; fingers.forEach(f => { fingerPath(f); ctx.stroke(); });
  ctx.lineWidth = 14; thumbPath(); ctx.stroke();
  ctx.lineWidth = 3; palmPath(); ctx.stroke();
  ctx.strokeStyle = SKIN; ctx.fillStyle = SKIN;
  ctx.lineWidth = 9.5; fingers.forEach(f => { fingerPath(f); ctx.stroke(); });
  ctx.lineWidth = 11; thumbPath(); ctx.stroke();
  palmPath(); ctx.fill();
  // nails and knuckle creases
  ctx.fillStyle = NAIL;
  for (const [y, len, tipY] of fingers) {
    const dx = len, dy = tipY - y, d = Math.hypot(dx, dy);
    ctx.beginPath(); ctx.ellipse(12 + len - dx / d * 3.5, tipY - dy / d * 3.5, 3.4, 2.6, Math.atan2(dy, dx), 0, TAU); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(21, -31, 3.6, 2.8, -0.25, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,50,.45)'; ctx.lineWidth = 1.4;
  for (const [y, len, tipY] of fingers) {
    const kx = 12 + len * 0.5, ky = y + (tipY - y) * 0.5;
    ctx.beginPath(); ctx.moveTo(kx, ky - 3); ctx.lineTo(kx, ky + 3); ctx.stroke();
  }
  // Dorsal tendons run lengthwise from the wrist to the knuckles, not across a palm.
  ctx.strokeStyle = 'rgba(120,70,50,.25)'; ctx.lineWidth = 1.2;
  for (const [y] of fingers) {
    ctx.beginPath(); ctx.moveTo(-13, y * 0.45); ctx.quadraticCurveTo(0, y * 0.7, 14, y); ctx.stroke();
  }
  ctx.restore();
}

// The human: top view at the right edge of the room. Only the target hand is drawn here;
// strike() owns the other arm in every pose, including rest.
function human(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = SLEEVE; ctx.beginPath(); ctx.ellipse(1055, 300, 95, 215, 0, 0, TAU); ctx.fill();
  const hx = HAND.x + Math.sin(t * 1.3) * 2, hy = HAND.y + Math.cos(t * 1.1) * 2;
  const elbow: Point = { x: 1040, y: 185 };
  arm(ctx, elbow, { x: hx + 14, y: hy });
  // Right hand, back up: thumb points toward the body. The bite target stays on HAND.
  hand(ctx, { x: hx + 8, y: hy }, Math.atan2(hy - elbow.y, hx - elbow.x), HAND_SCALE, 1);
  ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(1000, 300, 52, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(1006, 246, 9, 14, 0, 0, TAU); ctx.ellipse(1006, 354, 9, 14, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a1d1a'; ctx.beginPath(); ctx.arc(1012, 300, 47, 0, TAU); ctx.fill();
  const glow = ctx.createRadialGradient(LAMP.x, LAMP.y, 2, LAMP.x, LAMP.y, 26);
  glow.addColorStop(0, 'rgba(255,245,190,.95)'); glow.addColorStop(1, 'rgba(255,245,190,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(LAMP.x, LAMP.y, 26, 0, TAU); ctx.fill();
}

// Marks the hand: a quiet label early on, a pulsing "bite here" ring once the prey is collected.
function handMark(ctx: CanvasRenderingContext2D, g: Game, t: number) {
  const ready = g.score >= GOAL;
  if (ready) {
    ctx.fillStyle = 'rgba(250,118,103,.2)'; ctx.beginPath(); ctx.arc(HAND.x, HAND.y, HAND.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(HAND.x, HAND.y, HAND.r + Math.sin(t * 7) * 4, 0, TAU); ctx.stroke();
  }
  ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = ready ? '#ffd166' : 'rgba(255,255,255,.4)';
  ctx.fillText(ready ? 'УКУСИ!' : 'РУКА ЧЕЛОВЕКА', HAND.x - 8, HAND.y + HAND.r + 22);
}

function slipper(ctx: CanvasRenderingContext2D, p: Point, angle: number, scale: number) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.fillStyle = '#7a4f3a'; ctx.beginPath(); ctx.ellipse(0, 0, 78, 40, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#a56d4f'; ctx.beginPath(); ctx.ellipse(-8, -4, 56, 26, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// One owner for the attacking forearm AND hand: idle, wind-up, impact and recovery.
// A strike remains present through timer === -0.5, including frozen end frames.
function strike(ctx: CanvasRenderingContext2D, g: Game) {
  const s = g.strike;
  const reach = s ? clamp01(s.hit ? 1 + s.timer / 0.5 : 1 - s.timer / 0.95) : 0;
  if (s && !s.hit) {
    ctx.strokeStyle = '#fa7667'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, s.y, 76, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(250,118,103,${0.15 + reach * 0.3})`; ctx.beginPath(); ctx.arc(s.x, s.y, 76 * reach, 0, TAU); ctx.fill();
  }
  // Both ends of the attack meet the actual resting wrist, not the offscreen shoulder.
  const tip: Point = s
    ? { x: RESTING_HAND.x + (s.x - RESTING_HAND.x) * reach, y: RESTING_HAND.y + (s.y - RESTING_HAND.y) * reach }
    : RESTING_HAND;
  const restAngle = Math.atan2(RESTING_HAND.y - SHOULDER.y, RESTING_HAND.x - SHOULDER.x);
  const aimAngle = s ? Math.atan2(s.y - SHOULDER.y, s.x - SHOULDER.x) : restAngle;
  const turn = Math.atan2(Math.sin(aimAngle - restAngle), Math.cos(aimAngle - restAngle));
  const angle = restAngle + turn * reach;
  arm(ctx, SHOULDER, tip);
  // Keep the attacking hand above the slipper throughout the strike.
  if (s) slipper(ctx, tip, angle, 0.5 + 0.5 * reach);
  // Left hand, back up: the opposite thumb side to the resting right hand.
  hand(ctx, tip, angle, HAND_SCALE, -1);
}

function spider(ctx: CanvasRenderingContext2D, g: Game, t: number) {
  if (g.invincible > 0 && Math.floor(t * 14) % 2 === 0) return;
  // Soft halo keeps the dark spider readable on the dark floor and inside shelters.
  const halo = ctx.createRadialGradient(g.player.x, g.player.y, 4, g.player.x, g.player.y, 40);
  halo.addColorStop(0, 'rgba(205,185,255,.5)'); halo.addColorStop(1, 'rgba(205,185,255,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(g.player.x, g.player.y, 40, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(g.player.x, g.player.y); ctx.rotate(g.facing); ctx.scale(1.35, 1.35);
  ctx.globalAlpha = isHidden(g) ? 0.6 : 1;
  ctx.strokeStyle = '#0d0912'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const base = (i - 1.5) * 0.55, wig = Math.sin(t * 16 + i * 1.7 + side) * 0.18;
      const a = (Math.PI / 2 + base * 0.8 + wig) * side;
      const kx = Math.cos(a) * 11, ky = Math.sin(a) * 11 - 0 + (i - 1.5) * 3;
      ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(kx, ky); ctx.lineTo(kx + (i - 1.5) * 5, ky + side * 9); ctx.stroke();
    }
  }
  ctx.fillStyle = '#17101f'; ctx.beginPath(); ctx.ellipse(-8, 0, 10, 8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff4d3d'; ctx.beginPath(); ctx.arc(-9, -2, 2, 0, TAU); ctx.arc(-9, 2.5, 2, 0, TAU); ctx.arc(-4, 0, 1.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#241a30'; ctx.beginPath(); ctx.arc(5, 0, 5.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -2, 1.3, 0, TAU); ctx.arc(8, 2, 1.3, 0, TAU); ctx.fill();
  ctx.restore();
}

function darkness(ctx: CanvasRenderingContext2D, g: Game) {
  const lit = g.suspicion > 0.5;
  // beam from the human's headlamp to the lit spot on the floor
  const dx = g.light.x - LAMP.x, dy = g.light.y - LAMP.y, d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d * 125, ny = dx / d * 125;
  const beam = ctx.createLinearGradient(LAMP.x, LAMP.y, g.light.x, g.light.y);
  beam.addColorStop(0, 'rgba(255,240,180,.32)'); beam.addColorStop(1, 'rgba(255,236,170,.1)');
  ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(LAMP.x, LAMP.y);
  ctx.lineTo(g.light.x + nx, g.light.y + ny); ctx.lineTo(g.light.x - nx, g.light.y - ny); ctx.closePath(); ctx.fill();
  ctx.fillStyle = lit ? 'rgba(255,214,140,.2)' : 'rgba(255,236,170,.12)';
  ctx.beginPath(); ctx.arc(g.light.x, g.light.y, 125, 0, TAU); ctx.fill();
  const gr = ctx.createRadialGradient(g.light.x, g.light.y, 40, g.light.x, g.light.y, 340);
  gr.addColorStop(0, 'rgba(8,6,16,0)'); gr.addColorStop(0.4, 'rgba(8,6,16,.14)'); gr.addColorStop(1, 'rgba(8,6,16,.45)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
}

function hud(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.fillStyle = 'rgba(8,6,16,.78)'; ctx.fillRect(0, 0, WORLD.w, 48);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = 'bold 20px system-ui';
  const sec = Math.ceil(g.time);
  ctx.fillStyle = sec <= 15 ? '#fa7667' : '#f1ecf8';
  ctx.fillText(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, 16, 25);
  ctx.fillStyle = g.score >= GOAL ? '#9be564' : '#f1ecf8'; ctx.fillText(`Мухи ${Math.min(g.score, 99)}/${GOAL}`, 100, 25);
  ctx.fillStyle = '#fa7667'; ctx.fillText('♥'.repeat(Math.max(0, g.health)) + '♡'.repeat(Math.max(0, 3 - g.health)), 250, 25);
  ctx.fillStyle = '#b7abcb'; ctx.font = '14px system-ui'; ctx.fillText('Шёлк', 350, 25);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(413 + i * 22, 25, 8, 0, TAU);
    ctx.fillStyle = i < g.silk ? '#e6f4ff' : 'rgba(230,244,255,.15)'; ctx.fill();
  }
  ctx.fillStyle = '#b7abcb'; ctx.fillText('Заметность', 520, 25);
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(610, 17, 150, 16);
  ctx.fillStyle = g.suspicion > 0.7 ? '#fa7667' : '#ffd166'; ctx.fillRect(610, 17, 150 * g.suspicion, 16);
  const pct = 1 - g.time / DURATION;
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(790, 21, 190, 8);
  ctx.fillStyle = '#7b6aa8'; ctx.fillRect(790, 21, 190 * pct, 8);
  ctx.textBaseline = 'alphabetic';
}

function banner(ctx: CanvasRenderingContext2D, text: string, color: string) {
  ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 36;
  ctx.fillStyle = 'rgba(8,6,16,.78)'; ctx.beginPath(); ctx.roundRect(WORLD.w / 2 - w / 2, WORLD.h - 56, w, 38, 10); ctx.fill();
  ctx.fillStyle = color; ctx.fillText(text, WORLD.w / 2, WORLD.h - 30);
}

export function draw(ctx: CanvasRenderingContext2D, g: Game, v: View): void {
  // Always erase the whole previous frame before drawing hands or moving scene parts.
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#282138'; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.save();
  room(ctx); shelters(ctx); human(ctx, v.t); webs(ctx, g);
  if (v.target) {
    ctx.strokeStyle = 'rgba(155,229,100,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(v.target.x, v.target.y, 10 + Math.sin(v.t * 8) * 2, 0, TAU); ctx.stroke();
  }
  darkness(ctx, g); handMark(ctx, g, v.t); flies(ctx, g, v.t); strike(ctx, g); spider(ctx, g, v.t);
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, p.life / 0.8); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  hud(ctx, g);
  if (g.status === 'playing') {
    if (g.score >= GOAL) banner(ctx, 'Добыча собрана — кусай руку человека!', '#ffd166');
    else if (g.strike && !g.strike.hit && !isHidden(g)) banner(ctx, 'Тапок! Уходи с красного круга!', '#fa7667');
    else if (g.suspicion > 0.6 && !isHidden(g)) banner(ctx, 'Фонарь тебя заметил — в укрытие!', '#ffd166');
  }
}
