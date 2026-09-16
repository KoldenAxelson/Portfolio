// save.ts — persistence (design §10): readable JSON in localStorage, plus
// export/import. Storage can throw or be absent (private windows, restricted
// iframes), so every access is guarded and the game runs without it.

import type { MineDispatch, Pet, SaveFile } from './types';
import { STAT_KEYS } from './types';
import { randomSeed } from './rng';

const SAVE_KEY = 'dpp.save.v1';

let memory: string | null = null;

function read(): string | null {
  try {
    return window.localStorage.getItem(SAVE_KEY) ?? memory;
  } catch {
    return memory;
  }
}

function write(json: string): boolean {
  memory = json;
  try {
    window.localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch {
    return false;
  }
}

export function storageAvailable(): boolean {
  try {
    const k = `${SAVE_KEY}.probe`;
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const num = (value: unknown, fallback: number): number => (typeof value === 'number' ? value : fallback);

function validPet(p: Pet | undefined): p is Pet {
  if (!p || typeof p !== 'object' || !p.stats) return false;
  return STAT_KEYS.every((k) => {
    const stat = p.stats[k];
    return stat && typeof stat.value === 'number' && typeof stat.level === 'number' && typeof stat.grade === 'string';
  });
}

/** Fill in fields an older or hand-edited save may lack. */
function repairPet(p: Pet): Pet {
  for (const k of STAT_KEYS) p.stats[k].progress = num(p.stats[k].progress, 0);
  p.alignment = num(p.alignment, 0);
  p.happiness = num(p.happiness, 50);
  p.age = num(p.age, 0);
  p.cooldowns = p.cooldowns ?? {};
  p.generation = num(p.generation, 1);
  p.petWindowStart = num(p.petWindowStart, 0);
  p.petWindowCount = num(p.petWindowCount, 0);
  return p;
}

const validDispatch = (d: MineDispatch): boolean =>
  !!d && d.module === 'mine' && typeof d.petId === 'string' && typeof d.startedAt === 'number' && typeof d.seed === 'number';

/** Shape check only — the save is plain JSON a player may have hand-edited. */
function validateSave(data: unknown): SaveFile | null {
  if (!data || typeof data !== 'object') return null;
  const s = data as Partial<SaveFile>;
  if (s.version !== 1) return null;
  if (!Array.isArray(s.pets) || !s.inventory || typeof s.inventory !== 'object') return null;
  if (!Array.isArray(s.inventory.eggs) || typeof s.inventory.powerups !== 'object') return null;
  if (!s.pets.every(validPet)) return null;
  return {
    version: 1,
    clock: num(s.clock, 0),
    coins: num(s.coins, 0),
    pets: s.pets.map(repairPet),
    inventory: s.inventory,
    flags: Array.isArray(s.flags) ? s.flags : [],
    dispatches: Array.isArray(s.dispatches) ? s.dispatches.filter(validDispatch) : [],
    milestones: {
      firstHatch: !!s.milestones?.firstHatch,
      firstEvolution: !!s.milestones?.firstEvolution,
      firstReincarnation: !!s.milestones?.firstReincarnation,
    },
    seed: num(s.seed, randomSeed()),
    savedAt: num(s.savedAt, 0),
  };
}

export function loadSave(): SaveFile | null {
  const raw = read();
  if (!raw) return null;
  try {
    return validateSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function storeSave(save: SaveFile): boolean {
  return write(JSON.stringify(save));
}

export function clearSave(): void {
  memory = null;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Trigger a download of the save as a .json file. */
export function exportSave(save: SaveFile): void {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `digital-pet-place-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Open a file picker; resolves with a validated save or null (cancel / bad file). */
export function importSave(): Promise<SaveFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    document.body.appendChild(input);
    const done = (v: SaveFile | null): void => {
      input.remove();
      resolve(v);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      file
        .text()
        .then((txt) => done(validateSave(JSON.parse(txt))))
        .catch(() => done(null));
    });
    // No reliable cancel event across browsers; a cancelled picker leaves the
    // hidden input behind until the next import replaces it.
    input.click();
  });
}
