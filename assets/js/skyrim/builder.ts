// builder — the three-screen potion builder for /misc/skyrim/.
//
// Screen 1 picks potion / poison / either. Screen 2 is the effect grid, where
// anything that cannot share a bottle with your current picks greys out. Screen
// 3 is the brews. Back at every step.
//
// ── The one rule ────────────────────────────────────────────────────────────
//   An effect appears in a brew when TWO OR MORE of its ingredients carry it.
//   So a combination of effects is possible only if some set of two or three
//   ingredients has two carriers for every effect you asked for. That is the
//   whole of it, and it is why "Fortify Sneak + Fortify Marksman" is impossible:
//   no two ingredients share Sneak while another two share Marksman inside a
//   three-slot mortar.
//
// ── How the search is kept cheap ────────────────────────────────────────────
//   Effect sets are bitmasks. There are 59 effects and JavaScript's bitwise
//   operators are 32-bit, so each mask is a {lo, hi} pair.
//
//   For a chosen set S, every valid combo must contain at least two ingredients
//   carrying S's rarest effect — otherwise that effect could not appear. So we
//   anchor on that effect, take only its carriers K (6-31 ingredients), and
//   enumerate pairs from K plus pairs-from-K with any third ingredient. That is
//   ~85,000 candidate triples at worst instead of C(183,3) = 1,004,731, and each
//   check is three ANDs and two ORs.
//
//   The same pass produces both answers the UI needs: the brews themselves, and
//   the union of everything those brews can do — which is exactly the set of
//   effects still selectable. One search, both jobs.

interface Ing {
  slug: string; name: string; value: number; avail: number; dlc: string;
  lo: number; hi: number; fx: number[];
}
interface Combo {
  ing: Ing[]; fx: number[]; avail: number; value: number;
  /** Applied multiplier per effect index — 1 unless a deviating ingredient is in the mix. */
  mult: Record<number, number>;
  /** Sum of the multipliers on the effects you actually asked for. */
  potency: number;
  /**
   * True when two or more DEVIATING ingredients carry one of the effects you
   * asked for. The game then uses only the higher-priority one — and priority
   * is the ingredient's cost for that effect, not its magnitude, so the bigger
   * multiplier can lose. Such combos are ranked below unambiguous ones so the
   * "most potent" headline is a number we can actually stand behind.
   */
  murky: boolean;
}

let EFFECTS: string[] = [];
let MULT: Record<string, [number, number]>[] = []; // effect index -> slug -> [mag, dur]
let BASE_MAG: number[] = [];                       // effect index -> base magnitude
let ING: Ing[] = [];
let BY_FX: Ing[][] = []; // effect index -> ingredients carrying it

/** Effects shared by two or more of `set` — the brew it actually produces. */
function brewOf(set: Ing[]): { lo: number; hi: number } {
  let lo = 0, hi = 0;
  for (let a = 0; a < set.length; a++) {
    for (let b = a + 1; b < set.length; b++) {
      lo |= set[a].lo & set[b].lo;
      hi |= set[a].hi & set[b].hi;
    }
  }
  return { lo, hi };
}

const has = (lo: number, hi: number, i: number): boolean =>
  i < 32 ? (lo & (1 << i)) !== 0 : (hi & (1 << (i - 32))) !== 0;

function toList(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < EFFECTS.length; i++) if (has(lo, hi, i)) out.push(i);
  return out;
}

export interface SearchResult {
  /** The winner for each ranking, in RANKS order. Chosen over EVERY combo. */
  best: (Combo | null)[];
  /** A bounded sample for the "show more" list — not used for ranking. */
  sample: Combo[];
  total: number;
  reachable: Set<number>; // effects that could still be added to the selection
}

// The sample is only what "show more" scrolls through. Rankings are decided by
// running winners held across the whole search, so a common effect with tens of
// thousands of combinations still gets its true best — an earlier version
// ranked over the first N collected and quietly lost Salmon Roe's x12.5 Fortify
// Magicka because it sat past the cutoff.
const SAMPLE = 400;

/** Every brew delivering all of `want`, plus what else is still reachable. */
export function search(want: number[]): SearchResult {
  const sample: Combo[] = [];
  const best: (Combo | null)[] = RANKS.map(() => null);
  const reachable = new Set<number>();
  let total = 0;

  if (!want.length) {
    // Nothing chosen yet: every effect is reachable, since each is carried by
    // at least two ingredients (an invariant of data/skyrim/ingredients.yaml).
    EFFECTS.forEach((_, i) => { if (BY_FX[i].length >= 2) reachable.add(i); });
    return { best, sample, total, reachable };
  }

  let wantLo = 0, wantHi = 0;
  want.forEach((i) => { if (i < 32) wantLo |= 1 << i; else wantHi |= 1 << (i - 32); });

  // Anchor on the rarest wanted effect — the fewest carriers means the smallest
  // candidate pool, and any valid combo must include two of them.
  let anchor = want[0];
  for (const i of want) if (BY_FX[i].length < BY_FX[anchor].length) anchor = i;
  const K = BY_FX[anchor];

  const seen = new Set<string>();
  const take = (set: Ing[]): void => {
    const b = brewOf(set);
    if ((b.lo & wantLo) !== wantLo || (b.hi & wantHi) !== wantHi) return;
    const key = set.map((x) => x.slug).sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    total++;
    const fx = toList(b.lo, b.hi);
    fx.forEach((i) => reachable.add(i));
    const mult: Record<number, number> = {};
    fx.forEach((i) => { const m = multFor(set, i); if (m !== 1) mult[i] = m; });
    const murky = want.some((i) => MULT[i] && set.filter((g) => MULT[i][g.slug]).length > 1);
    const combo: Combo = {
      ing: set,
      fx,
      avail: set.reduce((s, x) => s + x.avail, 0),
      value: set.reduce((s, x) => s + x.value, 0),
      mult,
      potency: want.reduce((s, i) => s + (mult[i] || 1), 0),
      murky,
    };
    RANKS.forEach((r, i) => { if (!best[i] || r.cmp(combo, best[i] as Combo) < 0) best[i] = combo; });
    if (sample.length < SAMPLE) sample.push(combo);
  };

  for (let a = 0; a < K.length; a++) {
    for (let b = a + 1; b < K.length; b++) {
      take([K[a], K[b]]);
      for (let c = 0; c < ING.length; c++) {
        const third = ING[c];
        if (third === K[a] || third === K[b]) continue;
        take([K[a], K[b], third]);
      }
    }
  }
  return { best, sample, total, reachable };
}

// ── Rankings ────────────────────────────────────────────────────────────────
const RANKS: { key: string; label: string; blurb: string; cmp: (a: Combo, b: Combo) => number }[] = [
  {
    key: 'effects', label: 'Most effects', blurb: 'the most out of one bottle',
    cmp: (a, b) => b.fx.length - a.fx.length || b.avail - a.avail || a.ing.length - b.ing.length,
  },
  {
    // Extra effects are not free: they change what the bottle counts as, and a
    // resist potion that also restores stamina is not the resist potion you
    // asked for. Fewest total effects means fewest unasked-for ones, since the
    // set you asked for is fixed.
    key: 'clean', label: 'Nothing extra', blurb: 'the effects you asked for and no others',
    cmp: (a, b) => a.fx.length - b.fx.length || b.avail - a.avail || a.ing.length - b.ing.length,
  },
  {
    key: 'avail', label: 'Easiest to gather', blurb: 'things you already walk past',
    // Tie-break on a clean result: two equally-gatherable brews should not be
    // separated at random when one of them carries a passenger.
    cmp: (a, b) => b.avail - a.avail || a.fx.length - b.fx.length || a.ing.length - b.ing.length,
  },
  {
    key: 'potent', label: 'Most potent', blurb: 'the biggest multipliers on what you asked for',
    // Unambiguous first: a combo where two deviating ingredients fight over the
    // same effect might not deliver the multiplier we would print.
    cmp: (a, b) =>
      Number(a.murky) - Number(b.murky) || b.potency - a.potency || b.fx.length - a.fx.length || b.avail - a.avail,
  },
  {
    key: 'simple', label: 'Fewest ingredients', blurb: 'least to carry, easiest to remember',
    cmp: (a, b) => a.ing.length - b.ing.length || b.avail - a.avail || b.fx.length - a.fx.length,
  },
];

/**
 * The multiplier a combo actually applies to one effect.
 *
 * Most ingredients are 1.0. The deviating ones are in data/skyrim/effects.yaml —
 * Salmon Roe x12.5 on Fortify Magicka, Watcher's Eye x5 on Fortify Illusion,
 * Screaming Maw x4 on Regenerate Health, River Betty x2.5 on Damage Health.
 *
 * Which number matters depends on the effect: for Paralysis, Invisibility,
 * Waterbreathing, Light and Night Eye the base magnitude is 0 and all the
 * strength is in the duration, so those read the duration multiplier instead.
 *
 * Where two DEVIATING ingredients both carry the effect the game uses only the
 * higher-priority one — and UESP believes priority is the ingredient's cost for
 * that effect, not its magnitude, so the bigger multiplier does not always win.
 * We take the best present: exact whenever at most one deviating ingredient
 * carries the effect, which is nearly always, and optimistic otherwise.
 */
function multFor(set: Ing[], e: number): number {
  const table = MULT[e];
  if (!table) return 1;
  const useDur = BASE_MAG[e] === 0;
  let best = 1;
  for (const ing of set) {
    const row = table[ing.slug];
    if (!row) continue;
    const v = useDur ? row[1] : row[0];
    if (Math.abs(v - 1) > Math.abs(best - 1)) best = v;
  }
  return best;
}

// ── Wiring ──────────────────────────────────────────────────────────────────

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function comboCard(c: Combo, want: number[], badge?: string): string {
  const ings = c.ing
    .map((i) => `<li class="sky-bi"><b>${esc(i.name)}</b>${i.dlc ? `<i>${i.dlc}</i>` : ''}<em>${'●'.repeat(i.avail)}${'○'.repeat(5 - i.avail)}</em></li>`)
    .join('');
  const fx = c.fx
    .map((i) => {
      const m = c.mult[i];
      const badge = m && m !== 1 ? `<b>×${m % 1 ? m.toFixed(2).replace(/0$/, '') : m}</b>` : '';
      return `<li class="sky-chip${want.indexOf(i) !== -1 ? ' sky-chip--tag' : ''}${m && m > 1 ? ' is-boosted' : ''}">${esc(EFFECTS[i])}${badge}</li>`;
    })
    .join('');
  return (
    `<article class="sky-brew">` +
    (badge ? `<p class="sky-brew__badge">${esc(badge)}</p>` : '') +
    `<ul class="sky-bis">${ings}</ul><ul class="sky-chips">${fx}</ul></article>`
  );
}

export function initBuilder(): void {
  document.querySelectorAll<HTMLElement>('[data-builder]').forEach((root) => {
    const raw = root.querySelector<HTMLElement>('[data-builder-data]');
    const results = root.querySelector<HTMLElement>('[data-results]');
    const head = root.querySelector<HTMLElement>('[data-result-head]');
    const picked = root.querySelector<HTMLElement>('[data-picked]');
    const brewBtn = root.querySelector<HTMLButtonElement>('[data-brew]');
    if (!raw || !results || !picked || !brewBtn) return;

    // Payload keys are single letters to keep the blob small — see the
    // shortcode's header comment: s(lug) n(ame) v(alue) a(vailability) d(lc)
    // f(our effect ids).
    const data = JSON.parse(raw.textContent || '{}') as {
      e: string[];
      i: { s: string; n: string; v: number; a: number; d: string; f: number[] }[];
      x: Record<string, [number, number]>[];
      bm: number[];
    };
    EFFECTS = data.e;
    MULT = data.x || [];
    BASE_MAG = data.bm || [];
    ING = data.i.map((r) => {
      let lo = 0, hi = 0;
      r.f.forEach((i) => { if (i < 32) lo |= 1 << i; else hi |= 1 << (i - 32); });
      return { slug: r.s, name: r.n, value: r.v, avail: r.a, dlc: r.d, lo, hi, fx: r.f };
    });
    BY_FX = EFFECTS.map(() => []);
    ING.forEach((ing) => ing.fx.forEach((i) => BY_FX[i].push(ing)));

    const fxButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-fx]'));
    let kind: 'good' | 'bad' | 'any' = 'any';
    let want: number[] = [];
    let showAll = false;

    const go = (n: number): void => {
      root.setAttribute('data-screen', String(n));
      root.querySelectorAll<HTMLElement>('[data-scr]').forEach((s) => {
        s.hidden = s.getAttribute('data-scr') !== String(n);
      });
    };

    /** Grey out anything that cannot join what is already selected. */
    const refresh = (): void => {
      const { reachable } = search(want);
      fxButtons.forEach((b) => {
        const i = parseInt(b.dataset.fx || '0', 10);
        const inKind = kind === 'any' || b.dataset.kind === kind;
        b.parentElement!.hidden = !inKind;
        const on = want.indexOf(i) !== -1;
        b.classList.toggle('is-on', on);
        b.disabled = !on && !reachable.has(i);
      });
      const names = want.map((i) => EFFECTS[i]);
      picked.textContent = names.length
        ? `${names.join(' + ')}`
        : 'Pick one. Anything that cannot share a bottle with it will grey out.';
      brewBtn.disabled = !want.length;
    };

    const render = (): void => {
      const res = search(want);
      if (head) head.textContent = want.map((i) => EFFECTS[i]).join(' + ');

      if (!res.total) {
        results.innerHTML = `<p class="sky-hint">Nothing can produce that combination.</p>`;
        return;
      }

      // One headline per ranking, deduplicated: if the same brew wins two
      // categories, say so on the one card rather than printing it twice.
      const picks: { c: Combo; labels: string[] }[] = [];
      RANKS.forEach((r, i) => {
        const win = res.best[i];
        if (!win) return;
        const seen = picks.find((p) => p.c === win);
        if (seen) seen.labels.push(r.label);
        else picks.push({ c: win, labels: [r.label] });
      });

      const rest = res.sample
        .filter((c) => !picks.some((p) => p.c === c))
        .sort(RANKS[0].cmp)
        .slice(0, showAll ? 24 : 0);

      const n = res.total.toLocaleString('en-US');
      results.innerHTML =
        `<div class="sky-brews">${picks.map((p) => comboCard(p.c, want, p.labels.join(' · '))).join('')}</div>` +
        (rest.length ? `<div class="sky-brews sky-brews--rest">${rest.map((c) => comboCard(c, want)).join('')}</div>` : '') +
        `<div class="sky-scr__foot">` +
        `<p class="sky-hint">${n} brew${res.total === 1 ? '' : 's'} produce this.</p>` +
        (res.sample.length > picks.length
          ? `<button type="button" class="sky-go sky-go--ghost" data-more>${showAll ? 'Show less' : 'Show more'}</button>`
          : '') +
        `</div>`;

      const more = results.querySelector<HTMLButtonElement>('[data-more]');
      if (more) more.addEventListener('click', () => { showAll = !showAll; render(); });
    };

    root.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach((b) => {
      if (!b.classList.contains('sky-pick__b')) return;
      b.addEventListener('click', () => {
        kind = (b.dataset.kind as 'good' | 'bad' | 'any') || 'any';
        want = [];
        refresh();
        go(2);
      });
    });

    fxButtons.forEach((b) => {
      b.addEventListener('click', () => {
        const i = parseInt(b.dataset.fx || '0', 10);
        const at = want.indexOf(i);
        if (at === -1) want.push(i); else want.splice(at, 1);
        refresh();
      });
    });

    brewBtn.addEventListener('click', () => { showAll = false; render(); go(3); });

    root.querySelectorAll<HTMLButtonElement>('[data-back]').forEach((b) => {
      b.addEventListener('click', () => {
        const now = parseInt(root.getAttribute('data-screen') || '1', 10);
        go(Math.max(1, now - 1));
      });
    });

    refresh();
    go(1);
  });
}
