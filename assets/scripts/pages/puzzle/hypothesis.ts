/* Scratchpad.
 *
 * This file exists to be edited. It starts as the current best solver and is
 * where the next guess goes, so experiments never touch a solver the page
 * depends on. Reach it with {{< puzzle-solver solver="hypothesis" >}} and
 * compare it against `support` side by side on the same page.
 *
 * Guesses already tried and rejected on this box, so they don't get tried
 * twice — all measured against the plain search at 20,332 blocks placed:
 *
 *   least-constraining-value ordering      32,460   worse, and it is the
 *                                                   textbook recommendation
 *   full bipartite matching per line       14,514   fewer blocks, 6x the time
 *   both together                          24,074   worse
 *   fill a whole row at a time            309,360   much worse
 *   random restarts (best cutoff)         ~32,288   worse
 *   pick row-multiset first, arrange after          40x slower: 98.4% of the
 *                                                   1,012 tallies are unbuildable
 *   row permutation parity as a filter              does not separate usable
 *                                                   rows from dead ones
 *
 * Still untried and worth a go: exploiting the box's own symmetry (see the
 * article — blue<->purple, green<->yellow, 1<->3, 2<->5 maps every solution to
 * another solution), conflict-directed backjumping, and learning which of the
 * 44 usable row patterns are compatible before searching.
 */

import { SupportedSearch } from './support';
import type { SearchOptions } from './search';
import type { Board } from './board';

export class HypothesisSearch extends SupportedSearch {
  constructor(board: Board, options: Partial<SearchOptions> = {}) {
    super(board, options, 'touched');
  }

  // Override viable() here to try something new. Call super.viable() first if
  // the new idea is meant to add to the current pruning rather than replace it.
}
