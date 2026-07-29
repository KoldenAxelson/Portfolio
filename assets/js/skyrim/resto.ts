// resto — the Restoration-loop planner for /misc/skyrim/.
//
// You give it a target percentage. It gives you the wear pattern that lands
// closest, round by round, and how many rounds that takes.
//
// ── Defaults ────────────────────────────────────────────────────────────────
//   Alchemy 100, Alchemist 5/5, Benefactor. Enchanting 100, Enchanter 5/5.
//   Four Fortify Alchemy pieces at the natural 25% each — enchanted WITHOUT a
//   potion, which is the only self-consistent starting point. Every one of those
//   is editable under Configuration; they are defaults, not constants, so the
//   planner still works for a half-built character or for bootstrapped gear.
//
// ── ALCHEMY (UESP, Skyrim:Alchemy Effects) ──────────────────────────────────
//   mag = BaseMag * 4 * (1 + S/200) * (1 + E/100) * (1 + A/100)
//                 * (1 + Be/100) * (1 + Sk/100)
//   E is the SUMMED Fortify Alchemy across worn gear. Fortify Restoration has
//   BaseMag 4 and Fortify Enchanting has BaseMag 1, so the restoration potion is
//   always exactly four times the enchanting one. Duration never scales — only
//   Invisibility, Paralysis, Slow and Waterbreathing do — but it never binds
//   either: unequipping and re-equipping resets the Fortify Restoration timer,
//   so the 60s is not a clock you are racing. No round is time-limited.
//
// ── ENCHANTING (UESP, Skyrim:Enchanting Effects — the VANILLA branch) ───────
//   mag = floor(BaseMag * skillMult * (1 + Enchanter) * (1 + categoryPerk) * (1 + SoS))
//   skillMult = 1 + x*(x - 0.14)/3.4,  x = skill * (1 + potion/100) / 100
//   The load-bearing detail: a Fortify Enchanting potion does NOT multiply the
//   finished magnitude. It scales your EFFECTIVE SKILL inside a quadratic, so
//   the enchantment ends up quadratic in potion strength. (USSEP changes this to
//   a flat outer multiplier — and separately takes the Fortify effects out of
//   the Restoration school, which kills the loop entirely. None of this applies
//   if you run it.)
//
//   BaseMag and the category perk both come from the picker: skill enchantments
//   are base 8 or 13 and take Insightful Enchanter, elemental resists are base
//   15 and take Fire/Frost/Storm, attributes are base 20 and take Corpus. The
//   groups live in data/skyrim/enchantments.yaml.
//
// ── THE LOOP ────────────────────────────────────────────────────────────────
//   Every Fortify <Skill> effect — potion and apparel enchantment alike — is
//   internally school-of-Restoration, so a Fortify Restoration potion boosts
//   them, and re-equipping gear while one is active bakes the larger value in.
//   With x = the active fraction and e = the summed gear fraction:
//
//       x_{n+1} = r * (1 + e*(1 + x_n)) * (1 + x_n),      x_0 = 0
//                 \_______ brewed _______/  \_ applied _/
//
//   Two compounding factors per round: the gear you re-equipped is worth
//   e*(1+x_n), and the new potion is ITSELF a Restoration effect, so drinking it
//   while the old one still runs multiplies it a second time. Growth is
//   quadratic, not geometric.
//
//   Crucially the gear recomputes from ITS OWN BASE each time — a piece is worth
//   base * (1 + x_at_last_equip), not a value that stacks on itself. All the
//   compounding lives in x. That is what makes the per-piece bookkeeping below
//   tractable, and it is what reproduces the field numbers.
//
//   The recurrence is a derivation, not a published formula. Its evidence:
//   solving x_{n+1} = x_n gives r*e*x^2 + [r(1+2e) - 1]*x + r(1+e) = 0, whose
//   discriminant is (1-r)^2 - 4re — exactly UESP's published divergence
//   condition e > (1-r)^2/(4r). It also reproduces all three of UESP's worked
//   examples and a 122% field report at three rounds.
//
// ── WHY THE PLANNER NAMES PIECES ────────────────────────────────────────────
//   Wearing every piece every round overshoots wildly (121% at three rounds,
//   9,874% at four). The throttle is how many are on WHILE YOU BREW. And a piece
//   only takes the boost if it is on your body at the re-equip — one left off
//   keeps whatever it was worth last time it went on. So the four drift apart in
//   value and WHICH ones you wear matters, not just how many. Plans name pieces
//   A-D for that reason, and each round is clickable to show where all four
//   stand at that moment.
//
// ── ACCURACY ────────────────────────────────────────────────────────────────
//   Every documented anchor reproduces exactly: a 15% Fortify Enchanting potion
//   bare, the 25% natural cap on base-8 skill enchantments, 29% Fortify Alchemy
//   from a 32% potion, 32% back out of 4x29% gear. Against a 122% field report
//   at three rounds it gives 121.6%. UESP flags the 0.14 and 3.4 in the skill
//   curve as an empirical fit rather than engine constants — moving 3.4 to 3.3
//   moves that number to 124 — so the last digit is soft. Everything upstream of
//   the enchanting step is exact.

const POTION = { restoration: 4, enchanting: 1 };
const LETTERS = 'ABCDE'; // a fifth slot is reachable via the helmet + circlet bug
const MAX_ROUNDS = 6;
const MAX_STATES = 90000; // guard-rail; the UI says so out loud if it is hit

export interface Params {
  alchemy: number;        // skill, 15-100
  alchemist: number;      // perk rank, 0-5 (each rank is +20%)
  benefactor: boolean;    // +25% to beneficial potions
  seekerShadows: boolean; // Black Book: The Sallow Regent — +10% potion magnitude
  enchanting: number;     // skill, 15-100
  enchanter: number;      // perk rank, 0-5 (each rank is +20%)
  seekerSorcery: boolean; // Black Book: Untold Legends — +10% enchanting
  pieces: number;         // Fortify Alchemy items worn, 1-5
  perPiece: number;       // Fortify Alchemy % on each
  base: number;           // enchantment base magnitude (8 / 10 / 13 / 15 / 20 / 25)
  perk: boolean;          // this group HAS a +25% perk, and you have taken it
}

/** Alchemy multiplier applied to an effect's base magnitude. E is summed gear %. */
function alchemy(p: Params, E: number): number {
  return (
    4 *
    (1 + p.alchemy / 200) *
    (1 + E / 100) *
    (1 + (p.alchemist * 20) / 100) *
    (1 + (p.benefactor ? 25 : 0) / 100) *
    (p.seekerShadows ? 1.1 : 1)
  );
}

/** Displayed magnitude of the chosen enchantment, given a Fortify Enchanting potion. */
function enchant(p: Params, potion: number): number {
  const x = (p.enchanting * (1 + potion / 100)) / 100;
  return (
    p.base *
    (1 + (x * (x - 0.14)) / 3.4) *
    (1 + p.enchanter * 0.2) *
    (p.perk ? 1.25 : 1) *
    (p.seekerSorcery ? 1.1 : 1)
  );
}

const mask = (m: number, n: number): string => {
  let s = '';
  for (let i = 0; i < n; i++) if (m & (1 << i)) s += LETTERS[i];
  return s || 'nothing';
};

export interface Step {
  n: number;
  worn: string;     // pieces on your body while you brewed this round
  brewed: number;   // the Fortify Restoration potion as it reads in your inventory
  active: number;   // what it is worth once drunk on top of the live one
  pieces: number[]; // each piece's Fortify Alchemy % after the re-equip
}

export interface Plan {
  value: number;  // the enchantment you land on
  rounds: number;
  steps: Step[];
  brew: string;         // pieces worn for the final Fortify Enchanting brew
  gear: number;         // summed Fortify Alchemy at that moment
  potion: number;       // the Fortify Enchanting potion it yields
  finalPieces: number[]; // what each piece is worth when you walk to the enchanter
}

export interface Solution {
  best: Plan | null;
  under: Plan | null; // nearest reachable value below the target
  over: Plan | null;  // nearest reachable value at or above it
  natural: number;    // what you can place with no potion at all
  truncated: boolean;
}

interface State { x: number; t: number[]; m: number; parent: State | null; depth: number }

/**
 * Closest reachable value to `target`, and the nearest either side.
 *
 * Breadth-first over reachable states, deduplicated on (active boost, the four
 * piece values) — most wear patterns converge on the same numbers, so the count
 * stays in the thousands. Deepens one round at a time and stops as soon as a
 * plan lands on the target's displayed integer, so easy targets cost almost
 * nothing and only awkward ones pay for the full search.
 */
export function solve(p: Params, target: number): Solution {
  const r = (POTION.restoration * alchemy(p, 0)) / 100;
  const N = Math.max(1, Math.min(LETTERS.length, Math.round(p.pieces)));
  const PIECE = p.perPiece / 100;
  const SUBSETS = 1 << N;
  const cap = 300; // stop past ~30,000% gear; far beyond anything the game survives

  const trace = (s: State): Step[] => {
    const chain: State[] = [];
    for (let c: State | null = s; c && c.parent; c = c.parent) chain.unshift(c);
    return chain.map((c, i) => {
      const prev = c.parent as State;
      let E = 0;
      for (let j = 0; j < N; j++) if (c.m & (1 << j)) E += PIECE * (1 + prev.t[j]);
      return {
        n: i + 1,
        worn: mask(c.m, N),
        brewed: r * (1 + E) * 100,
        active: c.x * 100,
        pieces: c.t.map((v) => PIECE * (1 + v) * 100),
      };
    });
  };

  const natural = enchant(p, 0);
  let best: Plan | null = null, under: Plan | null = null, over: Plan | null = null;
  // The game FLOORS the enchantment, so a plan landing on 200.04 (reads 200%)
  // beats one landing on 199.96 (reads 199%) even though both are 0.04 away.
  // Match the displayed integer first, then prefer fewer rounds, then get close.
  const hits = (v: number): boolean => Math.floor(v) === Math.floor(target);
  const score = (pl: Plan): number =>
    hits(pl.value) ? pl.rounds * 1e6 + Math.abs(pl.value - target) : 1e12 + Math.abs(pl.value - target);
  const consider = (pl: Plan): void => {
    if (!best || score(pl) < score(best)) best = pl;
    if (pl.value < target && (!under || pl.value > under.value)) under = pl;
    if (pl.value >= target && (!over || pl.value < over.value)) over = pl;
  };

  // Placing it with no potion at all — the floor of the exercise, and the right
  // answer when the target is low enough.
  consider({ value: natural, rounds: 0, steps: [], brew: 'nothing', gear: 0, potion: 0, finalPieces: [] });

  /** Cash out: every wear pattern for the final Fortify Enchanting brew. */
  const cashOut = (s: State): void => {
    for (let m = 0; m < SUBSETS; m++) {
      let E = 0;
      for (let i = 0; i < N; i++) if (m & (1 << i)) E += PIECE * (1 + s.t[i]);
      const potion = POTION.enchanting * alchemy(p, E * 100);
      const value = enchant(p, potion);
      if (!Number.isFinite(value) || value <= 0) continue;
      consider({
        value, rounds: s.depth, steps: trace(s), brew: mask(m, N), gear: E * 100, potion,
        finalPieces: s.t.map((v) => PIECE * (1 + v) * 100),
      });
    }
  };

  const zeros: number[] = new Array(N).fill(0);
  const seen = new Set<string>([`0|${zeros.join(',')}`]);
  const root: State = { x: 0, t: zeros, m: 0, parent: null, depth: 0 };
  let frontier: State[] = [root];
  let count = 1;
  let truncated = false;
  cashOut(root);

  for (let d = 0; d < MAX_ROUNDS && !truncated; d++) {
    const next: State[] = [];
    for (const st of frontier) {
      for (let m = 0; m < SUBSETS; m++) {
        let E = 0;
        for (let i = 0; i < N; i++) if (m & (1 << i)) E += PIECE * (1 + st.t[i]);
        const x = r * (1 + E) * (1 + st.x);
        const t = st.t.slice();
        for (let i = 0; i < N; i++) if (m & (1 << i)) t[i] = x;
        if (Math.max(...t) * PIECE * N > cap) continue;
        const key = `${x.toFixed(6)}|${t.map((v) => v.toFixed(6)).sort().join(',')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const s: State = { x, t, m, parent: st, depth: d + 1 };
        next.push(s);
        if (++count >= MAX_STATES) { truncated = true; break; }
      }
      if (truncated) break;
    }
    next.forEach(cashOut);
    frontier = next;
    // Landed on the number, in the fewest rounds that can reach it. Searching
    // deeper can only turn up longer plans for the same result.
    if (best && hits(best.value)) break;
  }

  return { best, under, over, natural, truncated };
}

// ── Wiring ──────────────────────────────────────────────────────────────────

const field = (root: Element, name: string): HTMLInputElement | HTMLSelectElement | null =>
  root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${name}"]`);

const numOf = (root: Element, name: string, fallback: number): number => {
  const el = field(root, name);
  const v = el ? parseFloat(el.value) : NaN;
  return Number.isFinite(v) ? v : fallback;
};
const boolOf = (root: Element, name: string): boolean => {
  const el = field(root, name);
  return el instanceof HTMLInputElement && el.checked;
};

/** 1234.5 -> "1,234.5"; one decimal below 1000, none above. */
function fmt(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const d = Math.abs(v) >= 1000 ? 0 : 1;
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
/** Two decimals below 1000 — near a target, 199.96 and 200.04 must not both read "200.0". */
function fine(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const d = Math.abs(v) >= 1000 ? 0 : 2;
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** A whole number prints without a decimal — "200%", not "200.0%". */
function plain(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString('en-US') : fmt(v);
}

/** The four gear tiles: what every piece is worth, and whether it took the boost. */
function tiles(pieces: number[], worn: string): string {
  return (
    `<ul class="sky-gear">` +
    pieces
      .map((v, i) => {
        const on = worn.indexOf(LETTERS[i]) !== -1;
        return (
          `<li class="sky-gear__p${on ? ' is-on' : ''}">` +
          `<b>${LETTERS[i]}</b><span>${fmt(v)}<i>%</i></span>` +
          `<em>${on ? 'worn' : 'left off'}</em></li>`
        );
      })
      .join('') +
    `</ul>`
  );
}

export function initResto(): void {
  document.querySelectorAll<HTMLElement>('[data-resto]').forEach((root) => {
    const out = root.querySelector<HTMLElement>('[data-resto-plan]');
    const groupNote = root.querySelector<HTMLElement>('[data-resto-group-note]');
    const perkLabel = root.querySelector<HTMLElement>('[data-resto-perk-label]');
    const sel = field(root, 'effect');
    if (!out || !(sel instanceof HTMLSelectElement)) return;

    let current: Plan | null = null;
    let open = -1; // index into steps; steps.length means the final brew
    let timer = 0;
    // Whether you WANT the category perk, remembered separately from whether the
    // box is usable. Picking Resist Magic (no perk exists) has to clear it, but
    // coming back to Fortify Destruction must not leave the perk quietly off.
    let perkWanted = true;

    const read = (): Params => {
      const opt = sel.selectedOptions[0];
      return {
        alchemy: numOf(root, 'alchemy', 100),
        alchemist: numOf(root, 'alchemist', 5),
        benefactor: boolOf(root, 'benefactor'),
        seekerShadows: boolOf(root, 'seekerShadows'),
        enchanting: numOf(root, 'enchanting', 100),
        enchanter: numOf(root, 'enchanter', 5),
        seekerSorcery: boolOf(root, 'seekerSorcery'),
        pieces: numOf(root, 'pieces', 4),
        perPiece: numOf(root, 'perPiece', 25),
        base: parseFloat((opt && opt.dataset.base) || '8'),
        // The group's +25% applies wherever one exists; groups with an empty
        // `perk` genuinely have none, and the checkbox covers not having taken it.
        perk: !!(opt && opt.dataset.perk) && boolOf(root, 'perk'),
      };
    };

    /** The card under the timeline, describing whichever step is open. */
    const renderDetail = (): void => {
      const slot = out.querySelector<HTMLElement>('[data-slot]');
      if (!slot) return;
      const b = current;
      if (!b || open < 0) { slot.innerHTML = ''; return; }

      if (open >= b.steps.length) {
        slot.innerHTML =
          `<p class="sky-detail__head">Cash out — wear <b>${esc(b.brew)}</b></p>` +
          tiles(b.finalPieces, b.brew) +
          `<p class="sky-detail__foot">That is <b>${fmt(b.gear)}%</b> Fortify Alchemy on your body, which brews a ` +
          `<b>${fmt(b.potion)}%</b> Fortify Enchanting potion. Drink it at the arcane enchanter and place the ` +
          `enchantment.</p>`;
        return;
      }
      const s = b.steps[open];
      slot.innerHTML =
        `<p class="sky-detail__head">Round ${s.n} — wear <b>${esc(s.worn)}</b></p>` +
        tiles(s.pieces, s.worn) +
        `<p class="sky-detail__foot">Brew a <b>${fmt(s.brewed)}%</b> Fortify Restoration potion, take the gear off, ` +
        `drink it. On top of the one already running it is worth <b>${fmt(s.active)}%</b> — that is the multiplier ` +
        `the pieces above are re-equipped under.</p>`;
    };

    const renderPlan = (): void => {
      const p = read();
      const target = numOf(root, 'target', 200);
      const sol = solve(p, target);
      const b = sol.best;
      current = b;
      open = -1;
      if (!b) { out.innerHTML = ''; return; }

      const steps = b.steps
        .map((s) => `<li><button type="button" class="sky-flow__s" data-step="${s.n - 1}"><b>${s.n}</b>${esc(s.worn)}</button></li>`)
        .join('');
      const brew = b.rounds
        ? `<li><button type="button" class="sky-flow__s sky-flow__s--brew" data-step="${b.steps.length}">` +
          `<b>&#9670;</b>brew ${esc(b.brew)}</button></li>`
        : '';

      const lands = Math.floor(b.value) === Math.floor(target);
      const gap = sol.under && sol.over ? Math.abs(sol.over.value - sol.under.value) : 0;
      const meta = [
        `reads <b>${Math.floor(b.value)}%</b> in game`,
        b.rounds ? `<b>${b.rounds}</b> round${b.rounds === 1 ? '' : 's'}` : 'no loops needed',
        gap ? `finest step <b>${fine(gap)}%</b>` : '',
      ].filter(Boolean).join('<i>·</i>');

      out.innerHTML =
        `<p class="sky-plan__head">Closest landing on ${plain(target)}%</p>` +
        `<p class="sky-plan__value">${fine(b.value)}<i>%</i></p>` +
        `<p class="sky-plan__meta">${meta}</p>` +
        (b.rounds
          ? `<ol class="sky-flow">${steps}${brew}</ol>`
          : `<p class="sky-plan__note">Place it with no potion at all — the natural maximum already covers this.</p>`) +
        `<div class="sky-detail" data-slot></div>` +
        (lands && !sol.truncated
          ? ''
          : `<p class="sky-plan__note">` +
            (lands ? '' : `Nothing reachable reads exactly ${Math.floor(target)}%. `) +
            (sol.truncated ? `Search hit its ${MAX_STATES.toLocaleString('en-US')}-state ceiling, so a better plan may exist.` : '') +
            `</p>`);

      out.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.step || '0', 10);
          open = open === i ? -1 : i;
          out.querySelectorAll('[data-step]').forEach((o) => o.classList.toggle('is-open', open === i && o === btn));
          renderDetail();
        });
      });
    };

    /** Keep the perk checkbox honest about which perk it currently means. */
    const syncPicker = (): void => {
      const opt = sel.selectedOptions[0];
      const perk = (opt && opt.dataset.perk) || '';
      const cb = field(root, 'perk');
      if (perkLabel) perkLabel.textContent = perk || 'No perk applies';
      if (cb instanceof HTMLInputElement) {
        if (!cb.disabled) perkWanted = cb.checked; // only trust the box while it is live
        cb.disabled = !perk;
        cb.checked = perk ? perkWanted : false;
      }
      if (groupNote) groupNote.textContent = (opt && opt.dataset.note) || '';
    };

    const update = (): void => {
      syncPicker();
      window.clearTimeout(timer);
      out.setAttribute('data-busy', '');
      timer = window.setTimeout(() => { out.removeAttribute('data-busy'); renderPlan(); }, 180);
    };

    root.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', update);
      el.addEventListener('change', update);
    });

    // Configuration panel. It ships OPEN with its toggle hidden, so a reader
    // without JavaScript sees the assumptions rather than a dead "+" button;
    // here we reveal the button and collapse the panel.
    const cfg = root.querySelector<HTMLElement>('[data-config]');
    const cfgBtn = root.querySelector<HTMLButtonElement>('[data-config-toggle]');
    if (cfg && cfgBtn) {
      cfgBtn.hidden = false;
      cfg.hidden = true;
      cfgBtn.setAttribute('aria-expanded', 'false');
      cfgBtn.addEventListener('click', () => {
        cfg.hidden = !cfg.hidden;
        cfgBtn.setAttribute('aria-expanded', String(!cfg.hidden));
        cfgBtn.classList.toggle('is-open', !cfg.hidden);
      });
    }

    syncPicker();
    renderPlan();
  });
}
