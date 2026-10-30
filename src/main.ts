import { createGame, update, spinWeb, GOAL, DURATION, type Game } from './game';
import { draw } from './render';
import { createInput } from './input';
import { sfx, isMuted, setMuted } from './audio';

type Mode = 'menu' | 'playing' | 'paused' | 'ended';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const overlay = document.getElementById('overlay') as HTMLDivElement;
const btnWeb = document.getElementById('web') as HTMLButtonElement;
const btnPause = document.getElementById('pause') as HTMLButtonElement;
const btnMute = document.getElementById('mute') as HTMLButtonElement;
const btnRestart = document.getElementById('restart') as HTMLButtonElement;
const input = createInput(canvas);

const BEST_KEY = 'karakurt-best-catches';
const loadBest = (): number => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = (n: number): void => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* storage may be blocked */ } };

let game: Game = createGame();
let mode: Mode = 'menu';
let best = loadBest();

function setMode(next: Mode): void {
  mode = next;
  document.body.dataset.mode = next;
  btnPause.textContent = next === 'paused' ? 'Продолжить (P)' : 'Пауза (P)';
}

function show(html: string): void { overlay.innerHTML = html; overlay.hidden = false; }
function hide(): void { overlay.hidden = true; overlay.innerHTML = ''; }

function showMenu(): void {
  show(`<div class="card">
    <h1>Каракурт: ночная смена</h1>
    <p>Человек видит вредителя. А ты — просто паук, который собирает ужин.</p>
    <p class="big">Поймай ${GOAL} мух и вернись в зелёное гнездо за ${DURATION} секунд.</p>
    <p><b>Паутина</b> (Space / кнопка) — ставит ловушку: мухи в ней ловятся сами. Заряда три, один возвращается за 4 секунды.</p>
    <p><b>Фонарь</b> выдаёт тебя, <b>тапок</b> бьёт туда, где ты стоял: красный круг — беги! Укрытия (стол, шкаф, гнездо) защищают.</p>
    <p class="muted">Ходьба: WASD / стрелки или нажми и веди мышью/пальцем. Пауза: P или Esc. Три жизни.</p>
    ${best ? `<p class="muted">Рекорд: ${best} мух за смену</p>` : ''}
    <div class="row"><button data-act="start" autofocus>Начать смену</button></div>
  </div>`);
}

function showPause(): void {
  show(`<div class="card"><h1>Пауза</h1><p class="muted">Игра остановлена. Продолжай, когда будешь готов.</p>
    <div class="row"><button data-act="resume">Продолжить</button><button class="secondary" data-act="start">Заново</button></div></div>`);
}

function showEnd(): void {
  const won = game.status === 'won';
  const record = game.score > best;
  if (record) { best = game.score; saveBest(best); }
  show(`<div class="card"><h1>${won ? 'Ужин удался!' : 'Смена провалена'}</h1>
    <p class="big">${won ? 'Добыча дома, фонарь погас.' : game.reason}</p>
    <p>Мух поймано: <b>${game.score}</b> из ${GOAL} · Жизней осталось: <b>${Math.max(0, game.health)}</b> · Время: <b>${Math.round(game.elapsed)} с</b></p>
    ${record ? '<p class="muted">Новый рекорд!</p>' : best ? `<p class="muted">Рекорд: ${best}</p>` : ''}
    <div class="row"><button data-act="start" autofocus>Ещё раз</button></div></div>`);
  (overlay.querySelector('[data-act="start"]') as HTMLButtonElement | null)?.focus();
}

function start(): void {
  game = createGame();
  input.reset();
  hide();
  setMode('playing');
  sfx.unlock(); sfx.click();
}

function pause(): void {
  if (mode !== 'playing') return;
  setMode('paused'); showPause();
  (overlay.querySelector('button') as HTMLButtonElement | null)?.focus();
}
function resume(): void {
  if (mode !== 'paused') return;
  input.reset(); hide(); setMode('playing'); sfx.click();
}
function fireWeb(): void {
  if (mode === 'playing' && spinWeb(game)) sfx.web();
}
function refreshMute(): void { btnMute.textContent = isMuted() ? 'Звук: выкл' : 'Звук: вкл'; }

overlay.addEventListener('click', e => {
  const act = (e.target as HTMLElement).closest('button')?.dataset.act;
  if (act === 'start') start(); else if (act === 'resume') resume();
});
btnWeb.addEventListener('click', () => { fireWeb(); btnWeb.blur(); });
btnPause.addEventListener('click', () => { if (mode === 'paused') resume(); else pause(); btnPause.blur(); });
btnRestart.addEventListener('click', () => { start(); btnRestart.blur(); });
btnMute.addEventListener('click', () => { setMuted(!isMuted()); refreshMute(); sfx.click(); btnMute.blur(); });

window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (mode === 'playing') fireWeb();
    else if (mode === 'menu' || mode === 'ended') start();
    return;
  }
  if (e.code.startsWith('Arrow')) e.preventDefault();
  if (e.code === 'KeyP' || e.code === 'Escape') { if (mode === 'paused') resume(); else pause(); }
  else if (e.code === 'Enter') {
    if (mode === 'menu' || mode === 'ended') start(); else if (mode === 'paused') resume();
  } else if (e.code === 'KeyM') { setMuted(!isMuted()); refreshMute(); }
});

// Never run the game in the background: hidden tab or lost focus pauses it.
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', pause);

function step(dt: number): void {
  const hp = game.health, score = game.score, hadStrike = !!game.strike;
  update(game, dt, input.vector(game.player));
  if (game.score > score) sfx.catchFly();
  if (game.health < hp) sfx.hit();
  if (game.strike && !hadStrike) sfx.warn();
  if (game.status !== 'playing') {
    setMode('ended');
    if (game.status === 'won') sfx.win(); else sfx.lose();
    showEnd();
  }
}

let last = performance.now();
function frame(now: number): void {
  const dt = (now - last) / 1000;
  last = now;
  if (mode === 'playing') step(dt);
  draw(ctx, game, { t: now / 1000, target: input.target, best });
  requestAnimationFrame(frame);
}

refreshMute();
setMode('menu');
showMenu();
requestAnimationFrame(frame);
