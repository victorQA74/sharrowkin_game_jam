// Web Audio synthesized effects: no external assets, started only after a user gesture.
let ctx: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem('karakurt-muted') === '1'; } catch { /* storage may be blocked */ }

export const isMuted = () => muted;
export function setMuted(value: boolean): void {
  muted = value;
  try { localStorage.setItem('karakurt-muted', value ? '1' : '0'); } catch { /* ignore */ }
}

function audio(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch { return null; }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.1, slide = 0, delay = 0): void {
  if (muted) return;
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export const sfx = {
  unlock: () => { if (!muted) audio(); },
  click: () => tone(520, 0.07, 'triangle', 0.08),
  web: () => { tone(900, 0.16, 'sine', 0.07, -600); tone(1300, 0.1, 'triangle', 0.04, -700, 0.03); },
  catchFly: () => { tone(660, 0.09, 'square', 0.05); tone(990, 0.12, 'square', 0.05, 0, 0.07); },
  warn: () => { tone(180, 0.35, 'sawtooth', 0.06, 120); },
  hit: () => { tone(140, 0.28, 'square', 0.12, -90); tone(70, 0.3, 'sawtooth', 0.1, -30, 0.02); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, 0, i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'sawtooth', 0.07, 0, i * 0.15)),
};
