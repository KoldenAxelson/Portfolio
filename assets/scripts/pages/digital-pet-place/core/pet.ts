// pet.ts — birth, naming, and form evaluation.

import type { Bracket, Egg, Form, Grade, Pet, Stat, StatKey } from './types';
import { GRADES, STAT_KEYS } from './types';
import { GRADE_GAIN, HAPPINESS_START, STARTER_GRADE_WEIGHTS, bracketOf } from './rules';
import type { Rng } from './rng';

let idSeq = 0;
function newId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq.toString(36)}`;
}

// Soft consonants on purpose: garden creatures, not raid bosses.
const HEADS = ['mo', 'pi', 'lu', 'ta', 'ke', 'no', 'ri', 'su', 'be', 'fa', 'yu', 'do', 'wi', 'ha', 'ze', 'ni'];
const TAILS = ['bu', 'ko', 'mi', 'ra', 'lo', 'pa', 'te', 'na', 'shi', 'chu', 'ki', 'zu'];
const ENDS = ['', '', '', 'n', 'll', 'sh', 't'];

function rollName(rng: Rng): string {
  const raw = rng.pick(HEADS) + rng.pick(TAILS) + rng.pick(ENDS);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function rollStarterGrades(rng: Rng): Record<StatKey, Grade> {
  const out = {} as Record<StatKey, Grade>;
  for (const k of STAT_KEYS) out[k] = rng.weighted(STARTER_GRADE_WEIGHTS);
  return out;
}

export function makeEgg(grades: Record<StatKey, Grade>, levels: Record<StatKey, number>, generation: number): Egg {
  return { id: newId('egg'), grades, levels, generation };
}

export function makeStarterEgg(rng: Rng): Egg {
  return makeEgg(rollStarterGrades(rng), { swim: 0, fly: 0, run: 0, power: 0, stamina: 0 }, 1);
}

function statFromEgg(grade: Grade, level: number): Stat {
  return { grade, level, value: level * GRADE_GAIN[grade], progress: 0 };
}

export function hatchEgg(egg: Egg, rng: Rng, x: number, y: number): Pet {
  const stats = {} as Record<StatKey, Stat>;
  for (const k of STAT_KEYS) stats[k] = statFromEgg(egg.grades[k], egg.levels[k] ?? 0);
  return {
    id: newId('pet'),
    name: rollName(rng),
    stats,
    alignment: 0,
    happiness: HAPPINESS_START,
    age: 0,
    stage: 'hatchling',
    form: null,
    away: null,
    cooldowns: {},
    x,
    y,
    petWindowStart: 0,
    petWindowCount: 0,
    generation: egg.generation,
  };
}

/** Highest-Value stat; ties break toward the better Grade, then stat order. */
function dominantStat(pet: Pet): StatKey {
  let best: StatKey = STAT_KEYS[0];
  for (const k of STAT_KEYS) {
    const a = pet.stats[k];
    const b = pet.stats[best];
    if (a.value > b.value || (a.value === b.value && GRADES.indexOf(a.grade) > GRADES.indexOf(b.grade))) {
      best = k;
    }
  }
  return best;
}

export function evaluateForm(pet: Pet): Form {
  return { stat: dominantStat(pet), bracket: bracketOf(pet.alignment) };
}

export function bracketLabel(b: Bracket): string {
  return b === 'hero' ? 'Hero' : b === 'dark' ? 'Dark' : 'Neutral';
}

/** Best grade among the five — what an egg's speckles advertise. */
export function bestGrade(grades: Record<StatKey, Grade>): { stat: StatKey; grade: Grade } {
  let stat: StatKey = STAT_KEYS[0];
  for (const k of STAT_KEYS) {
    if (GRADES.indexOf(grades[k]) > GRADES.indexOf(grades[stat])) stat = k;
  }
  return { stat, grade: grades[stat] };
}
