// The "John Skyrim" module on /misc/skyrim/ — screen navigation, the levelling model
// behind the perk slider, and the gear doll's mode switch.
//
// Everything visible is server-rendered by layouts/shortcodes/john-skyrim.html. The only
// thing computed here is the answer to one question the page previously just asserted.
//
// ── BACK IS A STACK, NOT A DESTINATION ──────────────────────────────────────
//   Screens are reachable by more than one route: `potions` is a hub tile AND the exit
//   from the Alchemy perk screen; `gear` is a hub tile, the exit from Enchanting, and a
//   link on a potion card. A back button naming one fixed destination is wrong for every
//   route but one — the bug the potion builder patches around by rewriting screen 8's
//   target at open time.
//
//   The markup's `data-back="hub"` is the answer with no JavaScript. With it, the trail
//   wins: back goes where you came from, and the declared target is the floor.
//
// ── THE LEVELLING MODEL ─────────────────────────────────────────────────────
//   This module used to open by announcing "42 perks", which is a claim about how much
//   the build COSTS dressed up as a claim about what you can AFFORD — and nothing had
//   checked the second one. The slider replaces the assertion with the engine's own
//   arithmetic, from UESP Skyrim:Leveling:
//
//     raising a skill from S to S+1 grants (S+1) character XP    [fXPPerSkillRank = 1]
//     advancing character level L to L+1 costs base + mult×L     [75 and 25]
//     one perk point per level gained, so character level L has L-1
//
//   Two things make the number it reports a FLOOR rather than a guess. Only Speech and
//   Lockpicking are counted as incidental drift, when in practice a dozen skills creep
//   up — every one of those adds XP and therefore perks. And the build's own cost is
//   gated by skill level, so a perk needing Enchanting 100 is not counted as owed until
//   the slider is at 100.
//
//   What it does NOT model: quest rewards that raise skills, trainers, skill books, or
//   the Oghma Infinium. All of them push the same way — more level, more perks.

import { queryAll } from './util';

export interface Incidental {
  name: string;
  start: number;
  /** Fraction of the build skills' progress this one drifts at. A judgement, not data. */
  rate: number;
}

export interface SkillPlan {
  name: string;
  start: number;
  /** One entry per perk POINT the build spends here — the skill level that unlocks it. */
  gates: number[];
}

export interface Levelling {
  levelUpBase: number;
  levelUpMult: number;
  skills: SkillPlan[];
  incidental: Incidental[];
}

export interface Standing {
  /** Where the seven build skills have got to. */
  skillLevel: number;
  characterLevel: number;
  /** One per level gained, so a level-52 character has 51. */
  perksEarned: number;
  /** Perks the build wants that this skill level has actually unlocked. */
  perksOwed: number;
  totalXp: number;
}

/**
 * Character XP banked by taking one skill from `start` up to `level`.
 *
 * Each step grants the level you arrived at, so this is the sum of the integers from
 * start+1 to level — closed form, because the slider recomputes on every input event and
 * nine skills × eighty-five steps is not worth looping.
 */
export function skillXp(start: number, level: number): number {
  if (level <= start) return 0;
  return (level * (level + 1)) / 2 - (start * (start + 1)) / 2;
}

/** Total XP needed to have REACHED character level `level`, starting from level 1. */
export function xpToReach(level: number, base: number, mult: number): number {
  if (level <= 1) return 0;
  const steps = level - 1;
  return base * steps + (mult * steps * (steps + 1)) / 2;
}

/** The highest character level `xp` pays for. Walked, because the inverse is not clean. */
export function characterLevel(xp: number, base: number, mult: number): number {
  let level = 1;
  // 81 is where the vanilla skill ceiling puts you with every skill at 100; the guard is
  // a backstop against a malformed payload, not a real limit.
  while (level < 300 && xpToReach(level + 1, base, mult) <= xp) level++;
  return level;
}

/**
 * Where the character stands once the build skills have reached `skillLevel`.
 *
 * Incidental skills are assumed to have drifted `rate` as far over the same stretch —
 * floored, because a skill level is an integer and rounding up would flatter the answer.
 */
export function standingAt(model: Levelling, skillLevel: number): Standing {
  let totalXp = 0;
  let perksOwed = 0;
  for (const skill of model.skills) {
    totalXp += skillXp(skill.start, skillLevel);
    for (const gate of skill.gates) if (gate <= skillLevel) perksOwed++;
  }
  for (const other of model.incidental) {
    const drifted = Math.floor(other.start + Math.max(0, skillLevel - other.start) * other.rate);
    totalXp += skillXp(other.start, drifted);
  }
  const level = characterLevel(totalXp, model.levelUpBase, model.levelUpMult);
  return { skillLevel, characterLevel: level, perksEarned: level - 1, perksOwed, totalXp };
}

/** Every screen this module renders, in document order. */
export function screenNames(root: ParentNode): string[] {
  return queryAll<HTMLElement>(root, '[data-scr]').map((s) => s.getAttribute('data-scr') || '');
}

/**
 * Every screen name something on the page tries to reach — `data-go` and the no-JS
 * `data-back` fallback. Exported for the self-check, which asserts the two sets agree:
 * a screen renamed without its links renamed with it is a dead button, and a dead button
 * is exactly what a screenshot cannot see.
 */
export function linkTargets(root: ParentNode): string[] {
  const targets: string[] = [];
  for (const el of queryAll<HTMLElement>(root, '[data-go]')) targets.push(el.dataset.go || '');
  for (const el of queryAll<HTMLElement>(root, '[data-back]')) {
    const to = el.getAttribute('data-back');
    if (to) targets.push(to);
  }
  return targets;
}

export function initJohn(): void {
  for (const root of queryAll<HTMLElement>(document, '[data-john]')) setUp(root);
}

function setUp(root: HTMLElement): void {
  const screens = queryAll<HTMLElement>(root, '[data-scr]');
  if (!screens.length) return;

  /** Where we have been, most recent last. Never contains the screen currently shown. */
  const trail: string[] = [];

  /**
   * Hiding the outgoing screen destroys focus — it holds the button that was just
   * pressed — and the browser drops it to <body>, which on a page this long silently
   * returns a keyboard or screen-reader user to the very top. So the incoming screen
   * takes focus itself; it is a `tabindex="-1"` landmark, never a tab stop. `moveFocus`
   * is off for the initial call, which would otherwise steal focus and scroll on load.
   */
  const show = (name: string, moveFocus = true): void => {
    let incoming: HTMLElement | null = null;
    for (const screen of screens) {
      const active = screen.getAttribute('data-scr') === name;
      screen.hidden = !active;
      if (active) incoming = screen;
    }
    // An unknown name would hide every screen and leave an empty box. Refuse instead.
    if (!incoming) return;
    root.setAttribute('data-screen', name);
    if (moveFocus) incoming.focus();
  };

  const current = (): string => root.getAttribute('data-screen') || '';

  for (const button of queryAll<HTMLElement>(root, '[data-go]')) {
    button.addEventListener('click', () => {
      const to = button.dataset.go;
      if (!to || to === current()) return;
      trail.push(current());
      show(to);
    });
  }

  for (const button of queryAll<HTMLElement>(root, '[data-back]')) {
    button.addEventListener('click', () => {
      const to = trail.pop() || button.getAttribute('data-back') || '';
      if (to) show(to);
    });
  }

  setUpSlider(root);
  setUpGearModes(root);
  show(screens[0].getAttribute('data-scr') || '', false);
}

function setUpSlider(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('[data-level-slider]');
  const payload = root.querySelector('[data-levelling]');
  if (!slider || !payload) return;
  const model = JSON.parse(payload.textContent || '{}') as Levelling;
  if (!model.skills?.length) return;

  const out = {
    skill: root.querySelector<HTMLElement>('[data-out-skill]'),
    level: root.querySelector<HTMLElement>('[data-out-level]'),
    earned: root.querySelector<HTMLElement>('[data-out-earned]'),
    owed: root.querySelector<HTMLElement>('[data-out-owed]'),
    spare: root.querySelector<HTMLElement>('[data-out-spare]'),
    status: root.querySelector<HTMLElement>('[data-out-status]'),
  };
  const bars = queryAll<HTMLElement>(root, '[data-bar-skill]');

  const render = (): void => {
    const standing = standingAt(model, Number(slider.value));
    const spare = standing.perksEarned - standing.perksOwed;
    if (out.skill) out.skill.textContent = String(standing.skillLevel);
    if (out.level) out.level.textContent = String(standing.characterLevel);
    if (out.earned) out.earned.textContent = String(standing.perksEarned);
    if (out.owed) out.owed.textContent = String(standing.perksOwed);
    if (out.spare) {
      out.spare.textContent = spare >= 0 ? `${spare} spare` : `${-spare} short`;
      out.spare.classList.toggle('is-short', spare < 0);
    }
    // The slider is a range input and announces its own value; this says what the value
    // MEANS, which is the part a number alone does not carry.
    if (out.status) {
      out.status.textContent =
        `Seven skills at ${standing.skillLevel}: character level ${standing.characterLevel}, ` +
        `${standing.perksEarned} perks earned against ${standing.perksOwed} the build wants — ` +
        (spare >= 0 ? `${spare} spare.` : `${-spare} short.`);
    }
    // Each skill row dims the perks its own level has not unlocked yet, so the budget
    // reads as a thing that fills up rather than a thing that is simply true.
    for (const bar of bars) {
      const gates = (bar.dataset.gates || '').split(',').filter(Boolean).map(Number);
      const unlocked = gates.filter((gate) => gate <= standing.skillLevel).length;
      // Marked per cell, not by a custom property: `nth-child` takes a literal, so CSS
      // has no way to express "the first --on of them".
      const cells = queryAll<HTMLElement>(bar, '.sky-budget__bar i');
      cells.forEach((cell, index) => cell.classList.toggle('is-on', index < unlocked));
      const count = bar.querySelector('[data-bar-n]');
      if (count) count.textContent = `${unlocked}/${gates.length}`;
    }
  };

  slider.addEventListener('input', render);
  render();
}

/** Base / Extra Effect / Atronach. Every mode is in the markup; this picks one. */
function setUpGearModes(root: HTMLElement): void {
  const buttons = queryAll<HTMLButtonElement>(root, '[data-mode]');
  if (!buttons.length) return;
  const note = root.querySelector<HTMLElement>('[data-mode-note]');

  const apply = (mode: string): void => {
    for (const button of buttons) {
      const on = button.dataset.mode === mode;
      button.setAttribute('aria-pressed', String(on));
      if (on && note) note.textContent = button.dataset.note || '';
    }
    for (const set of queryAll<HTMLElement>(root, '[data-for-mode]')) {
      set.hidden = set.dataset.forMode !== mode;
    }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => apply(button.dataset.mode || ''));
  }
  apply(buttons[0].dataset.mode || '');
}
