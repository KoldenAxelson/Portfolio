// chime.ts — all sound is synthesised so the game ships no audio files. The
// AudioContext is created lazily on a user gesture, so autoplay policy never
// bites.

import type { StatKey } from '../core/types';

const BASE_HZ: Record<StatKey, number> = {
  power: 329.63, // E4
  swim: 392.0, // G4
  run: 440.0, // A4
  fly: 493.88, // B4
  stamina: 523.25, // C5
};

let ctx: AudioContext | null = null;
let muted = false;

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

export function setMuted(v: boolean): void {
  muted = v;
}

export function isMuted(): boolean {
  return muted;
}

function tone(freq: number, type: OscillatorType, attack: number, hold: number, release: number, gain: number, glide = 0): void {
  const ac = context();
  if (!ac || muted) return;
  if (ac.state === 'suspended') void ac.resume();
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(freq * glide, t0 + attack + hold);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.setValueAtTime(gain, t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + attack + hold + release + 0.05);
}

/** Catch chime. `streak` (0-based) lifts the pitch; capped at an octave. */
export function chimeCatch(stat: StatKey, streak: number, rare: boolean): void {
  const semis = Math.min(streak, 12);
  const hz = BASE_HZ[stat] * Math.pow(2, semis / 12);
  if (rare) {
    tone(hz / 2, 'triangle', 0.02, 0.18, 0.7, 0.16, 1.5);
    tone(hz, 'sine', 0.12, 0.2, 0.9, 0.08);
  } else {
    tone(hz, 'sine', 0.01, 0.05, 0.45, 0.14, 1.26);
    tone(hz * 2, 'sine', 0.01, 0.03, 0.3, 0.04);
  }
}

/** A short low blink when a star fades uncaught — quiet on purpose. */
export function chimeMiss(): void {
  tone(196, 'sine', 0.01, 0.02, 0.25, 0.03, 0.8);
}

/** Soft pop for petting / feeding in the garden. */
export function chimePop(up = true): void {
  tone(up ? 660 : 520, 'sine', 0.005, 0.02, 0.18, 0.07, up ? 1.3 : 0.85);
}

export function chimeHatch(): void {
  tone(523.25, 'triangle', 0.02, 0.1, 0.5, 0.1, 1.5);
  window.setTimeout(() => tone(783.99, 'sine', 0.02, 0.1, 0.6, 0.08), 140);
}
