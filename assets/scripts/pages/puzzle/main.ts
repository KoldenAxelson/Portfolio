/* The main widget: play it yourself, or hand it to a solver.
 *
 * The board is shared. Blocks you place by hand stay put when a solver takes
 * over and finishes from your position; blocks a solver placed can be picked
 * apart by hand afterwards. A fresh solver is built on each run so it sees the
 * current position as its starting point rather than an empty tray.
 *
 * Solve and Watch are the same driver at two paces — run(n) per animation
 * frame, with n large enough to look instant or small enough to follow.
 */

import { CELLS, kindsFrom, readBox } from './inventory';
import { Board } from './board';
import type { SearchOptions } from './search';
import { solverNamed } from './solver';
import type { Solver } from './solver';
import { BoardView } from './render';
import { TrayView } from './tray';
import { PlayController } from './play';
import { mountSwaps } from './swap';
import { mountBuilds } from './build';

/** Moves per animation frame. Both buttons drive the same loop; Solve takes a
 *  big enough bite to finish an empty board inside a single frame, Watch takes
 *  a small enough one to follow by eye. */
const PACE = { solve: 200000, watch: 5 };
/** Ceiling on one run. A hand-built position can be unsolvable, and proving
 *  that takes longer than anyone will sit through. Set well above the ~3M a
 *  legitimate search needs without canonical form, so a solvable position is
 *  never abandoned. */
const EFFORT_CAP = 8000000;
/** Above this pace the per-square flash is noise, so it is skipped. */
const FLASH_LIMIT = 24;

class Widget {
  private readonly root: HTMLElement;
  private readonly view: BoardView;
  private readonly tray: TrayView;
  private readonly play: PlayController;
  private readonly status: HTMLElement | null;
  private readonly statsEl: HTMLElement | null;
  private readonly options: Partial<SearchOptions>;
  private readonly solverKey: string | null;
  private readonly board: Board;
  private solver: Solver | null = null;
  private frame = 0;
  /** Which pace the current run uses. Survives a pause so resuming carries on
   *  at the same speed rather than reverting to a default. */
  private mode: 'solve' | 'watch' | null = null;
  private gaveUp = false;

  constructor(root: HTMLElement) {
    this.root = root;
    const box = readBox(root);
    const kinds = kindsFrom(box.blocks);
    this.board = new Board(kinds);
    this.view = new BoardView(root, box.palette);
    this.tray = new TrayView(root, kinds);
    this.play = new PlayController(root, this.board);
    this.status = root.querySelector<HTMLElement>('[data-puzzle-status]');
    this.statsEl = root.querySelector<HTMLElement>('[data-puzzle-stats]');
    this.solverKey = root.getAttribute('data-solver');

    const order = root.getAttribute('data-order') === 'scan' ? 'scan' : 'mrv';
    this.options = { order, canonical: root.getAttribute('data-canonical') !== 'false' };

    root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest<HTMLElement>('[data-action], [data-swap-action]');
      if (button && root.contains(button)) {
        this.dispatch(button.getAttribute('data-action') ?? button.getAttribute('data-swap-action') ?? '');
        return;
      }
      // Anything else is the reader moving blocks around; that stops a run.
      this.stop();
      if (this.play.click(target)) this.paint(true);
    });

    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-cell], [data-block]')) return;
      event.preventDefault();
      this.stop();
      if (this.play.click(target)) this.paint(true);
    });

    for (const el of root.querySelectorAll('[data-puzzle-controls]')) el.removeAttribute('hidden');
    this.paint(false);
  }

  private dispatch(action: string): void {
    if (action === 'reset') {
      this.stop();
      this.solver = null;
      this.gaveUp = false;
      this.play.clear();
      this.board.reset();
      this.paint(false);
      return;
    }
    if (action === 'toggle') {
      if (this.frame) {
        this.pause();
        this.paint(false); // the phase attribute drives the controls; refresh it
      } else if (this.mode && this.solver?.status === 'running') {
        this.run(this.mode);
      }
      return;
    }
    if (action !== 'solve' && action !== 'watch') return;
    this.pause();
    this.play.clear();
    this.gaveUp = false;
    // A new solver every run, so it treats whatever is on the board as given.
    //
    // Canonical form pins the first row and column to 1-6. That is only sound
    // from an empty board: it works by arguing you may shuffle rows and columns
    // freely, which stops being true the moment a reader has fixed blocks in
    // place. Searching a hand-built position without it is slower and correct.
    this.solver = solverNamed(this.solverKey).create(this.board, {
      ...this.options,
      canonical: this.board.filled === 0 && this.options.canonical !== false,
    });
    this.run(action);
  }

  private run(mode: 'solve' | 'watch'): void {
    this.mode = mode;
    const pace = PACE[mode];
    const tick = (): void => {
      if (!this.root.isConnected || !this.solver) {
        this.frame = 0;
        return;
      }
      const status = this.solver.run(pace);
      if (status === 'running' && this.solver.stats.placements > EFFORT_CAP) {
        this.gaveUp = true;
        this.frame = 0;
        this.paint(false);
        return;
      }
      if (status !== 'running') this.frame = 0;
      this.paint(pace <= FLASH_LIMIT);
      if (status === 'running') this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
    this.paint(false);
  }

  /** Halt the animation but keep the solver, so resuming continues rather than
   *  starting over. */
  private pause(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  /** Drop the search entirely — used when the reader touches the board. */
  private stop(): void {
    this.pause();
    this.mode = null;
  }

  private paint(flash: boolean): void {
    this.view.sync(this.board, flash);
    this.tray.sync(this.board);

    const held = this.play.selection();
    const broken = new Set(this.board.conflictCells());
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-cell]')) {
      const cell = Number(el.getAttribute('data-cell'));
      el.toggleAttribute('data-armed', cell === held.cell);
      el.toggleAttribute('data-conflict', broken.has(cell));
    }
    // The exact block clicked lights up, not the first identical one.
    this.root.querySelectorAll<HTMLElement>('[data-block]').forEach((el, i) => {
      el.toggleAttribute('data-armed', i === held.chip);
    });

    this.setPhase();

    if (this.statsEl) {
      const stats = this.solver?.stats;
      this.statsEl.textContent = stats && stats.placements
        ? `${stats.placements.toLocaleString()} placed · ${stats.backtracks.toLocaleString()} taken back · ${stats.ms.toFixed(0)} ms`
        : '';
    }
    this.report();
  }

  /** Which controls make sense right now. An empty board offers no reset,
   *  because there is nothing to undo; a finished one offers nothing else. */
  private setPhase(): void {
    this.root.setAttribute('data-phase', this.currentPhase());
    this.root.setAttribute('data-mode', this.mode ?? '');
  }

  private currentPhase(): string {
    if (this.frame) return 'running';
    // A solver still marked 'running' with no frame scheduled is a paused one.
    if (this.mode && this.solver?.status === 'running') return 'paused';
    if (this.board.filled === 0) return 'empty';
    if (this.board.filled === CELLS) return 'done';
    return 'idle';
  }

  /** Three states: nothing wrong yet, something wrong, done. The icon carries
   *  it; the sentence is only ever read aloud. */
  private report(): void {
    const complete = this.board.filled === CELLS;
    const problems = complete ? this.board.problems() : this.board.conflicts();
    const failed = this.solver?.status === 'exhausted' || this.gaveUp;
    const state = problems.length || failed ? 'error' : complete ? 'solved' : 'building';
    this.root.setAttribute('data-state', state);
    if (this.status) this.status.textContent = this.sentence(complete, problems);
  }

  private sentence(complete: boolean, problems: string[]): string {
    if (this.gaveUp) {
      return `Gave up after ${EFFORT_CAP.toLocaleString()} blocks; no solution found from this position.`;
    }
    if (this.solver?.status === 'exhausted') return 'No solution exists from this position.';
    if (problems.length) return `Not a solution: ${problems[0]}.`;
    if (complete) return 'Valid solution.';
    return `${this.board.filled} of ${CELLS} squares filled.`;
  }
}

function mountAll(): void {
  mountSwaps();
  mountBuilds();
  for (const node of document.querySelectorAll<HTMLElement>('[data-puzzle-solver]')) {
    if (node.dataset.puzzleMounted === 'true') continue;
    node.dataset.puzzleMounted = 'true';
    new Widget(node);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll);
} else {
  mountAll();
}
// hx-boost replaces <body> without a reload, so hydrate again after each swap.
document.addEventListener('htmx:afterSettle', mountAll);
