/* The puzzle's data.
 *
 * A 6x6 board and 36 physical blocks: six of each color, each stamped with a
 * number 1-6. Every row and every column must end up holding all six numbers
 * AND all six colors, using exactly these blocks and no others.
 *
 * The default box below is a wooden set from the 1930s. It is duplicated in
 * data/puzzle/boxes.yaml, which is the source the page actually renders from —
 * the shortcode embeds that YAML as JSON in the mount and readBox() picks it
 * up. The constant here is the fallback for when the widget is built without a
 * box attached, and the fixture the tests run against.
 */

export const SIZE = 6;
export const CELLS = SIZE * SIZE;

export const COLORS = ['orange', 'blue', 'green', 'red', 'yellow', 'purple'] as const;
export type ColorName = (typeof COLORS)[number];

/** A box of blocks: what the tray shows and what the solver may draw from. */
export interface Box {
  label: string;
  /** Color names, in the order the tray lists them. */
  palette: string[];
  /** Numbers on the six blocks of each color, indexed to match `palette`. */
  blocks: number[][];
}

export const DEFAULT_BOX: Box = {
  label: "Father's puzzle",
  palette: [...COLORS],
  blocks: [
    [1, 1, 3, 3, 6, 6], // orange
    [1, 1, 2, 4, 4, 5], // blue
    [1, 4, 5, 5, 5, 6], // green
    [1, 2, 3, 5, 6, 6], // red
    [2, 2, 2, 3, 4, 6], // yellow
    [2, 3, 3, 4, 4, 5], // purple
  ],
};

/** A distinct kind of block — a (number, color) pair — and how many exist. */
export interface Kind {
  /** 1-6, as printed on the block. */
  n: number;
  /** Index into the box's palette. */
  c: number;
  /** How many identical blocks the box contains. */
  count: number;
}

/** One integer per (color, number) pair, for use as a Map key.
 *
 *  The base is 10 rather than SIZE + 1 because numbers are printed 1..6 and a
 *  decimal key stays readable in a debugger. It is safe only while SIZE < 10;
 *  above that, two different pairs would collide silently and the box would
 *  quietly lose block kinds, so the assertion is worth stating out loud. */
export function kindKey(color: number, n: number): number {
  return color * 10 + n;
}

/** Collapse a box into its distinct block kinds, with duplicate counts.
 *  The 36 blocks of the default box reduce to 24 kinds; those twelve duplicates
 *  are what keep this puzzle solvable at all. */
export function kindsFrom(blocks: readonly (readonly number[])[] = DEFAULT_BOX.blocks): Kind[] {
  const byKey = new Map<number, Kind>();
  for (let c = 0; c < blocks.length; c++) {
    for (const n of blocks[c]) {
      const key = kindKey(c, n);
      const seen = byKey.get(key);
      if (seen) seen.count++;
      else byKey.set(key, { n, c, count: 1 });
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.c - b.c || a.n - b.n);
}

/** Read the box the shortcode embedded in this mount. Falls back to the default
 *  rather than throwing, so a malformed data file degrades to a working widget
 *  instead of a blank one. */
export function readBox(root: ParentNode): Box {
  const node = root.querySelector('script[data-puzzle-box]');
  if (!node || !node.textContent) return DEFAULT_BOX;
  try {
    const raw = JSON.parse(node.textContent) as Partial<Box>;
    if (!Array.isArray(raw.blocks) || !Array.isArray(raw.palette)) return DEFAULT_BOX;
    if (!raw.blocks.every((row) => Array.isArray(row) && row.every((n) => typeof n === 'number'))) {
      return DEFAULT_BOX;
    }
    return {
      label: typeof raw.label === 'string' ? raw.label : DEFAULT_BOX.label,
      palette: raw.palette.map(String),
      blocks: raw.blocks.map((row) => row.slice()),
    };
  } catch {
    return DEFAULT_BOX;
  }
}

/** Necessary conditions for any box to be placeable on a SIZE x SIZE board:
 *  every color needs exactly SIZE blocks (one per row) and every number needs
 *  to appear exactly SIZE times. Passing this does not prove a solution exists
 *  — Euler's 36 officers passes it and has none — but failing it proves one
 *  doesn't, cheaply. */
export function boxProblems(box: Box = DEFAULT_BOX): string[] {
  const problems: string[] = [];
  if (box.blocks.length !== SIZE) {
    problems.push(`expected ${SIZE} colors, found ${box.blocks.length}`);
  }
  const numberTally = new Map<number, number>();
  for (let c = 0; c < box.blocks.length; c++) {
    const blocks = box.blocks[c];
    if (blocks.length !== SIZE) {
      problems.push(`${box.palette[c] ?? `color ${c}`} has ${blocks.length} blocks, expected ${SIZE}`);
    }
    for (const n of blocks) numberTally.set(n, (numberTally.get(n) ?? 0) + 1);
  }
  for (let n = 1; n <= SIZE; n++) {
    const seen = numberTally.get(n) ?? 0;
    if (seen !== SIZE) problems.push(`number ${n} appears ${seen} times, expected ${SIZE}`);
  }
  return problems;
}
