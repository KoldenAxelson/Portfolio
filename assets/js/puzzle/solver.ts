/* What every solver has to look like.
 *
 * The widget talks to this and nothing else, so a new solving strategy is one
 * new file plus one line in the registry below — no changes to the renderer,
 * the tray, the controls, the CSS or the shortcode.
 *
 * The one real requirement is that a solver expresses its work as discrete
 * moves on a shared Board, because that is what makes it watchable. A strategy
 * that computes an answer in one shot can still satisfy this interface (run()
 * does the work, step() returns it in a single move), but Watch will show one
 * frame and then stop.
 */

import type { Board } from './board';
import type { Move, SearchOptions, Stats, Status } from './search';
import { Search } from './search';
import { SupportedSearch } from './support';
import { HypothesisSearch } from './hypothesis';

export interface Solver {
  /** The board being filled. Views read this; nothing else writes to it. */
  readonly board: Board;
  readonly stats: Stats;
  readonly status: Status;
  /** Clear the board and start over. */
  reset(): void;
  /** Advance by exactly one move; null once finished. */
  step(): Move | null;
  /** Advance by up to `budget` moves. */
  run(budget?: number): Status;
}

export interface SolverInfo {
  label: string;
  /** One line, shown under the board so a reader knows what they're watching. */
  blurb: string;
  create(board: Board, options: Partial<SearchOptions>): Solver;
}

export const SOLVERS: Record<string, SolverInfo> = {
  backtrack: {
    label: 'backtracking',
    blurb: 'Fills the most constrained square first and takes blocks back when it gets stuck.',
    create: (board, options) => new Search(board, options),
  },
  support: {
    label: 'backtracking + value support',
    blurb:
      'Also checks, after every block, that everything the row and column it just played into still needs has somewhere left to go. This is the rule a person can use.',
    create: (board, options) => new SupportedSearch(board, options, 'touched'),
  },
  'support-all': {
    label: 'value support, whole board',
    blurb:
      'The same check swept across all twelve lines after every block. Places fewer blocks than the version above and takes longer doing it.',
    create: (board, options) => new SupportedSearch(board, options, 'lines'),
  },
  hypothesis: {
    label: 'hypothesis scratchpad',
    blurb: 'A copy of the current best solver, kept free for trying the next guess.',
    create: (board, options) => new HypothesisSearch(board, options),
  },
};

export const DEFAULT_SOLVER = 'support';

export function solverNamed(name: string | null): SolverInfo {
  return (name && SOLVERS[name]) || SOLVERS[DEFAULT_SOLVER];
}
