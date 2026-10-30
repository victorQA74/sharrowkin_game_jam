import { WORLD, GOAL, DURATION, SHELTERS, isHidden, type Game, type Point } from './game';

export type View = { t: number; target: Point | null; best: number };

const TAU = Math.PI * 2;

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

function shelters(ctx: CanvasRenderingContext2D, g: Game, t: number) {
  const ready = g.score >= GOAL;
  SHELTERS.forEach((r, i) => {
    if (i === 1) { // table
      ctx.fillStyle = '#6b4a35'; ctx.fillRect(r.x - 14, r.y - 20, r.w + 28, 20);
      ctx.fillRect(r.x - 6, r.y, 10, r.h); ctx.fillRect(r.x + r.w - 4, r.y, 10, r.h);
    } else if (i === 2) { // wardrobe
      ctx.fillStyle = '#4f3a52'; ctx.fillRect(r.x - 6, r.y - 80, r.w + 12, 80);
      ctx.fillStyle = '#3c2b3f'; ctx.fillRect(r.x + r.w / 2 - 1, r.y - 78, 3, 76);
    }
    const pulse = r.home && ready ? 0.25 + 0.2 * Math.sin(t * 6) : 0;
    ctx.fillStyle = r.home ? `rgba(120,220,120,${0.16 + pulse})` : 'rgba(6,4,12,.55)';
    ctx.strokeStyle = r.home ? '#9be564' : '#8d79b0'; ctx.lineWidth = r.home && ready ? 4 : 2;
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
    const flap = 5 + Math.sin(t * 60 + f.phase) * 3;
    ctx.fillStyle = 'rgba(210,235,255,.65)';
    ctx.beginPath(); ctx.ellipse(-1, -5, 7, flap, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1, 5, 7, flap, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2f3b2a'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c9ed9e'; ctx.beginPath(); ctx.arc(4, 0, 2, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function strike(ctx: CanvasRenderingContext2D, g: Game) {
  const s = g.strike; if (!s) return;
  if (!s.hit) {
    const p = 1 - Math.max(0, s.timer) / 0.95;
    ctx.strokeStyle = '#fa7667'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, s.y, 76, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(250,118,103,${0.15 + p * 0.3})`; ctx.beginPath(); ctx.arc(s.x, s.y, 76 * p, 0, TAU); ctx.fill();
  } else {
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 + s.timer / 0.5); ctx.translate(s.x, s.y); ctx.rotate(-0.4);
    ctx.fillStyle = '#7a4f3a'; ctx.beginPath(); ctx.ellipse(0, 0, 78, 40, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#a56d4f'; ctx.beginPath(); ctx.ellipse(-8, -4, 56, 26, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function spider(ctx: CanvasRenderingContext2D, g: Game, t: number) {
  if (g.invincible > 0 && Math.floor(t * 14) % 2 === 0) return;
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
  room(ctx); shelters(ctx, g, v.t); webs(ctx, g);
  if (v.target) {
    ctx.strokeStyle = 'rgba(155,229,100,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(v.target.x, v.target.y, 10 + Math.sin(v.t * 8) * 2, 0, TAU); ctx.stroke();
  }
  darkness(ctx, g); flies(ctx, g, v.t); strike(ctx, g); spider(ctx, g, v.t);
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, p.life / 0.8); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  hud(ctx, g);
  if (g.status === 'playing') {
    if (g.score >= GOAL) banner(ctx, 'Добыча собрана — домой, в гнездо!', '#9be564');
    else if (g.strike && !g.strike.hit && !isHidden(g)) banner(ctx, 'Тапок! Уходи с красного круга!', '#fa7667');
    else if (g.suspicion > 0.6 && !isHidden(g)) banner(ctx, 'Фонарь тебя заметил — в укрытие!', '#ffd166');
  }
}
