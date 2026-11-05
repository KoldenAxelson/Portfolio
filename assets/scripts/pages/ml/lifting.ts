// The integer 5/3 lifting steps lossless JPEG 2000 uses (ITU-T T.800 Annex F;
// close to Calderbank et al.'s (2,2), which rounds the predict a little
// differently), shared by
// lifting-row.ts and lifting-image.ts. Edges mirror the row (symmetric
// extension), as the standard does. Every step adds a rounded amount worked
// out from the half it doesn't change, so the inverse subtracts the same amount.

export const mirror = (index: number, length: number): number => {
  if (length === 1) return 0;
  if (index < 0) return -index;
  if (index >= length) return 2 * (length - 1) - index;
  return index;
};

// Predict: each odd sample minus the rounded average of its even neighbours.
export function predict(row: number[]): number[] {
  return row.map((value, i) => (i % 2 === 1 ? value - Math.floor((row[mirror(i - 1, row.length)] + row[mirror(i + 1, row.length)]) / 2) : value));
}

// Update: each even sample plus a rounded quarter of the details either side.
export function update(row: number[]): number[] {
  return row.map((value, i) => (i % 2 === 0 ? value + Math.floor((row[mirror(i - 1, row.length)] + row[mirror(i + 1, row.length)] + 2) / 4) : value));
}

export function undoUpdate(row: number[]): number[] {
  return row.map((value, i) => (i % 2 === 0 ? value - Math.floor((row[mirror(i - 1, row.length)] + row[mirror(i + 1, row.length)] + 2) / 4) : value));
}

export function undoPredict(row: number[]): number[] {
  return row.map((value, i) => (i % 2 === 1 ? value + Math.floor((row[mirror(i - 1, row.length)] + row[mirror(i + 1, row.length)]) / 2) : value));
}

// One level on a row: the lifted values, then evens (smooth) before odds (details).
export function forwardRow(row: number[]): number[] {
  const lifted = update(predict(row));
  return [...lifted.filter((_, i) => i % 2 === 0), ...lifted.filter((_, i) => i % 2 === 1)];
}

export function inverseRow(packed: number[]): number[] {
  const half = Math.ceil(packed.length / 2);
  const interleaved = packed.map((_, i) => (i % 2 === 0 ? packed[i / 2] : packed[half + (i - 1) / 2]));
  return undoPredict(undoUpdate(interleaved));
}

type Grid = number[][];

const column = (grid: Grid, x: number, size: number): number[] => grid.slice(0, size).map((row) => row[x]);

// One 2-D level on the top-left size × size corner: columns, then rows, the
// order T.800 F.4.2 gives (VER_SD before HOR_SD). The inverse runs it backwards.
function forwardLevel(grid: Grid, size: number): Grid {
  const out = grid.map((row) => [...row]);
  for (let x = 0; x < size; x++) forwardRow(column(out, x, size)).forEach((value, y) => { out[y][x] = value; });
  for (let y = 0; y < size; y++) out[y].splice(0, size, ...forwardRow(out[y].slice(0, size)));
  return out;
}

function inverseLevel(grid: Grid, size: number): Grid {
  const out = grid.map((row) => [...row]);
  for (let y = 0; y < size; y++) out[y].splice(0, size, ...inverseRow(out[y].slice(0, size)));
  for (let x = 0; x < size; x++) inverseRow(column(out, x, size)).forEach((value, y) => { out[y][x] = value; });
  return out;
}

// Each further level works on the smooth top-left quarter of the one before.
export function forwardImage(grid: Grid, levels: number): Grid {
  let out = grid;
  for (let level = 0; level < levels; level++) out = forwardLevel(out, grid.length >> level);
  return out;
}

export function inverseImage(grid: Grid, levels: number): Grid {
  let out = grid;
  for (let level = levels - 1; level >= 0; level--) out = inverseLevel(out, grid.length >> level);
  return out;
}

// Bits per value if each distinct value got an ideal code for how often it
// appears (zeroth-order entropy). An estimate of what an entropy coder could
// reach, not a real coder's output.
export function bitsPerValue(values: number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let bits = 0;
  for (const count of counts.values()) {
    const share = count / values.length;
    bits -= share * Math.log2(share);
  }
  return bits;
}
