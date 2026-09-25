// The split-apply-combine family: a small request log split into groups by a
// key, each group reduced to one row, and the results put together as a new
// table. groupby, agg and pivot_table split by labels and resample by hour;
// rolling slides a window down the hourly counts, melt undoes a pivot, and
// to_datetime and .dt make the time column the time terms split by.
//
// Tables are frame.ts sheets. A group is a run of rows with a gap above it
// (SheetView.slots), and a result row sits beside its group before it moves
// into its own table. Every caption was checked against pandas 3.0.6 on these
// tables.
import type { Figure } from '../def-figures';
import type { CellState, Place, Tone } from './cells';
import { CELL_H, cellFigure } from './cells';
import type { Part, Sheet, SheetCells, SheetView } from './frame';
import { layOut, sheetState, TABLE_CELL_W } from './frame';

type Shot = { caption: string; views: [SheetCells, SheetView][] };
type Sequence = { shots: Shot[]; sheets: SheetCells[]; still: number; box: { rows: number; cols: number }; cellWidth?: number };

const GROUP_TONES: Tone[] = ['lit', 'alt', ''];
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);
const labels = (n: number): string[] => range(n).map(String);

/** Tones each value by the group its row belongs to. */
const byGroup = (groupOf: number[]) => (part: Part): Tone | undefined =>
  part.kind === 'value' ? GROUP_TONES[groupOf[part.r] ?? 2] : undefined;
const hidden: SheetView = { rows: [], hideHeader: true, hideIndex: true };

/* ── Split by endpoint: groupby and agg ─────────────────────────────────
   logs.groupby('endpoint'): /login is rows 0, 2, 5; /search 1, 3; /upload 4. */

const LOGS: Sheet = {
  index: labels(6),
  columns: ['endpoint', 'ms'],
  rows: [['/login', '100'], ['/search', '300'], ['/login', '300'], ['/search', '350'], ['/upload', '1500'], ['/login', '200']],
};
const ENDPOINTS = ['/login', '/search', '/upload'];
const GROUP_OF = [0, 1, 0, 1, 2, 0];
const GROUPED = [0, 2, 5, 1, 3, 4];
const GROUPED_SLOTS = [0, 1, 2, 3.4, 4.4, 5.8];
const GROUP_CENTRES = [1, 3.9, 5.8];

function splitApplyCombine(highlight: 'groupby' | 'agg'): Sequence {
  const result: Sheet = highlight === 'groupby'
    ? { index: ENDPOINTS, columns: ['ms'], rows: [['200.0'], ['325.0'], ['1500.0']] }
    : { index: ENDPOINTS, columns: ['n', 'mean'], rows: [['3', '200.0'], ['2', '325.0'], ['1', '1500.0']] };
  const [logs, reduced] = layOut([LOGS, result]) as [SheetCells, SheetCells];
  const plain: SheetView = { hideIndex: true };
  const split: SheetView = { hideIndex: true, rows: GROUPED, slots: GROUPED_SLOTS, tone: byGroup(GROUP_OF) };
  const resultTone = byGroup([0, 1, 2]);
  const call = highlight === 'groupby' ? "['ms'].mean(): one value per group" : ".agg(n=('ms', 'size'), mean=('ms', 'mean'))";
  const combined = highlight === 'groupby' ? '→ a Series indexed by endpoint, keys sorted' : '→ one row per group, one column per name';
  return {
    sheets: [logs, reduced],
    box: { rows: 7.8, cols: 5 },
    still: 3,
    shots: [
      { caption: 'logs: one row per request', views: [[logs, plain], [reduced, hidden]] },
      { caption: "logs.groupby('endpoint'): split the rows by key", views: [[logs, split], [reduced, hidden]] },
      { caption: call, views: [[logs, split], [reduced, { at: { r: 0, c: 3 }, hideIndex: true, slots: GROUP_CENTRES, tone: resultTone }]] },
      { caption: combined, views: [[logs, hidden], [reduced, { at: { r: 0, c: highlight === 'groupby' ? 1.5 : 1 }, tone: resultTone }]] },
    ],
  };
}

/* ── Split by endpoint and hour: pivot_table, and melt to undo it ────── */

const HOURLY_LOGS: Sheet = {
  index: labels(6),
  columns: ['endpoint', 'hour', 'ms'],
  rows: [['/login', '9', '100'], ['/search', '9', '300'], ['/login', '9', '300'], ['/search', '10', '350'], ['/upload', '10', '1500'], ['/login', '10', '200']],
};
const PIVOTED: Sheet = {
  index: ENDPOINTS,
  columns: ['9', '10'],
  rows: [['200.0', '200.0'], ['300.0', '350.0'], ['NaN', '1500.0']],
};
const isMissing = (part: Part, sheet: Sheet): boolean => part.kind === 'value' && sheet.rows[part.r]?.[part.c] === 'NaN';

function pivotTable(): Sequence {
  const [logs, wide] = layOut([HOURLY_LOGS, PIVOTED]) as [SheetCells, SheetCells];
  // One group per (endpoint, hour), in sorted order: (/login, 9) is rows 0 and 2.
  const split: SheetView = { hideIndex: true, rows: GROUPED, slots: [0, 1, 2.3, 3.6, 4.9, 6.2], tone: byGroup(GROUP_OF) };
  const wideTone = (part: Part): Tone | undefined => (isMissing(part, PIVOTED) ? 'bad' : byGroup([0, 1, 2])(part));
  return {
    sheets: [logs, wide],
    box: { rows: 8.2, cols: 5 },
    still: 2,
    shots: [
      { caption: 'logs: an endpoint, an hour and a time in ms per request', views: [[logs, { hideIndex: true, at: { r: 0, c: 1 } }], [wide, hidden]] },
      { caption: "logs.pivot_table(index='endpoint', columns='hour', values='ms')", views: [[logs, { ...split, at: { r: 0, c: 1 } }], [wide, hidden]] },
      { caption: 'a mean per endpoint and hour; /upload has none at 9 → NaN', views: [[logs, hidden], [wide, { at: { r: 0, c: 1 }, tone: wideTone }]] },
    ],
  };
}

// wide.melt(id_vars='endpoint', var_name='hour'): one row per value, the
// columns 9 then 10, so row k holds wide's row k % 3 and hour column k / 3.
function melt(): Sequence {
  const wideSheet: Sheet = {
    index: labels(3),
    columns: ['endpoint', ...PIVOTED.columns],
    rows: PIVOTED.rows.map((row, r) => [ENDPOINTS[r] ?? '', ...row]),
  };
  const longSheet: Sheet = {
    index: labels(6),
    columns: ['endpoint', 'hour', 'value'],
    rows: range(6).map((k) => [ENDPOINTS[k % 3] ?? '', PIVOTED.columns[Math.floor(k / 3)] ?? '', PIVOTED.rows[k % 3]?.[Math.floor(k / 3)] ?? '']),
  };
  const [wide, long] = layOut([wideSheet, longSheet]) as [SheetCells, SheetCells];
  const at = { r: 0, c: 1 };
  // Every wide cell lands on the long cell holding the same thing; the long
  // table's own copies of those cells stay hidden.
  const toLong = (part: Part): Place | null | undefined => {
    if (part.kind === 'column') return part.c === 0 ? { r: 0, c: 1 } : { r: 1 + (part.c - 1) * 3, c: 2 };
    if (part.kind !== 'value') return undefined;
    return part.c === 0 ? { r: 1 + part.r, c: 1 } : { r: 1 + (part.c - 1) * 3 + part.r, c: 3 };
  };
  const fromWide = (part: Part): Place | null | undefined => {
    if (part.kind === 'column' && part.c === 0) return null;
    if (part.kind !== 'value') return undefined;
    const isFromWide = part.c === 2 || (part.c === 0 && part.r < 3) || (part.c === 1 && part.r % 3 === 0);
    return isFromWide ? null : undefined;
  };
  const longTone = (part: Part): Tone | undefined => (part.kind === 'value' && part.c === 1 ? 'alt' : undefined);
  const wideTone = (part: Part): Tone | undefined => {
    if (isMissing(part, wideSheet)) return 'bad';
    if (part.kind === 'value' && part.c > 0) return 'lit';
    return part.kind === 'column' && part.c > 0 ? 'alt' : undefined;
  };
  return {
    sheets: [wide, long],
    box: { rows: 7, cols: 5 },
    still: 1,
    shots: [
      { caption: 'wide: one column per hour', views: [[wide, { at, hideIndex: true, tone: wideTone }], [long, hidden]] },
      { caption: "wide.melt(id_vars='endpoint', var_name='hour'): one row per value",
        views: [[wide, { hideIndex: true, move: toLong, tone: wideTone }],
          [long, { at, hideIndex: true, move: fromWide, tone: longTone }]] },
    ],
  };
}

/* ── Split by time: to_datetime, .dt, resample and rolling ──────────────
   Six requests on 2026-09-01, the times drawn as hh:mm. */

const TIMES: Sheet = {
  index: labels(6),
  columns: ['time', 'ms'],
  rows: [['09:05', '100'], ['09:41', '300'], ['10:02', '350'], ['10:15', '1500'], ['10:40', '200'], ['12:10', '300']],
  dtypes: ['str', 'int64'],
};
const HOUR_OF = [0, 0, 1, 1, 1, 3];
const HOURS = ['09:00', '10:00', '11:00', '12:00'];
const PER_HOUR = ['2', '3', '0', '1'];
const HOUR_TONES: Tone[] = ['lit', 'alt', 'ghost', 'lit'];
const byHour = (hourOf: number[]) => (part: Part): Tone | undefined =>
  part.kind === 'value' ? HOUR_TONES[hourOf[part.r] ?? 0] : undefined;

function toDatetime(): Sequence {
  const [times] = layOut([TIMES]) as [SheetCells];
  const view: SheetView = { cols: [0], hideIndex: true, showDtypes: true };
  return {
    sheets: [times],
    box: { rows: 8.3, cols: 1 },
    cellWidth: 104,
    still: 1,
    shots: [
      { caption: "logs['time'] is text: '2026-09-01 09:05', …", views: [[times, view]] },
      { caption: "pd.to_datetime(logs['time']) → datetime64[us]", views: [[times, {
        ...view,
        value: (part) => (part.kind === 'dtype' && part.c === 0 ? 'datetime64[us]' : undefined),
        tone: (part) => (part.kind === 'value' || part.kind === 'dtype' ? 'lit' : undefined),
      }]] },
    ],
  };
}

function dtHour(): Sequence {
  const hourNumbers = TIMES.rows.map(([time]) => String(Number(time?.slice(0, 2))));
  const hourSheet: Sheet = { index: labels(6), columns: ['hour'], rows: hourNumbers.map((hour) => [hour]) };
  const [times, hours] = layOut([TIMES, hourSheet]) as [SheetCells, SheetCells];
  const at = { r: 0, c: 1 };
  return {
    sheets: [times, hours],
    box: { rows: 7, cols: 5 },
    still: 1,
    shots: [
      { caption: "logs['time']: datetimes, drawn as hh:mm", views: [[times, { at, cols: [0] }], [hours, hidden]] },
      { caption: `logs['time'].dt.hour → ${hourNumbers.join(', ')}`, views: [
        [times, { at, cols: [0], tone: (part) => (part.kind === 'value' ? 'alt' : undefined) }],
        [hours, { at: { r: 1, c: 3 }, hideIndex: true, hideHeader: true, tone: (part) => (part.kind === 'value' ? 'lit' : undefined) }],
      ] },
    ],
  };
}

function resample(): Sequence {
  const countSheet: Sheet = { index: HOURS, columns: [''], rows: PER_HOUR.map((n) => [n]) };
  const [times, counts] = layOut([TIMES, countSheet]) as [SheetCells, SheetCells];
  // 11:00 has no rows; its gap is where its count lands.
  const binned: SheetView = { hideIndex: true, slots: [0, 1, 2.4, 3.4, 4.4, 6.4], tone: byHour(HOUR_OF) };
  const countTone = byHour([0, 1, 2, 3]);
  return {
    sheets: [times, counts],
    box: { rows: 8.4, cols: 5 },
    still: 3,
    shots: [
      { caption: 'logs: six requests on one day, times drawn as hh:mm', views: [[times, { hideIndex: true }], [counts, hidden]] },
      { caption: "logs.resample('h', on='time'): hour bins, each from its start up to the next", views: [[times, binned], [counts, hidden]] },
      { caption: '.size(): a count per bin, and the empty 11:00 bin counts 0', views: [[times, binned],
        [counts, { at: { r: 1, c: 2.5 }, hideHeader: true, slots: [0.5, 3.4, 5.4, 6.4], tone: countTone }]] },
      { caption: '→ one row per hour, labelled by its start', views: [[times, hidden], [counts, { at: { r: 0, c: 1.5 }, hideHeader: true, tone: countTone }]] },
    ],
  };
}

function rolling(): Sequence {
  const hourlySheet: Sheet = { index: HOURS, columns: [''], rows: PER_HOUR.map((n) => [n]) };
  const means = ['NaN', '2.5', '1.5', '0.5'];
  const meanSheet: Sheet = { index: HOURS, columns: [''], rows: means.map((m) => [m]) };
  const [hourly, rolled] = layOut([hourlySheet, meanSheet]) as [SheetCells, SheetCells];
  const at = { r: 0, c: 1 };
  const windowAt = (last: number): Shot => {
    const inWindow = (part: Part): boolean => part.kind === 'value' && part.r <= last && part.r >= last - 1;
    const sum = PER_HOUR.slice(Math.max(0, last - 1), last + 1).join(' + ');
    return {
      caption: last === 0 ? "hourly.rolling(2).mean(): 09:00 has no full window → NaN" : `(${sum}) / 2 = ${means[last] ?? ''}`,
      views: [
        [hourly, { at, hideHeader: true, tone: (part) => (inWindow(part) ? 'lit' : undefined) }],
        [rolled, { at: { r: 0, c: 3 }, hideIndex: true, hideHeader: true, rows: range(last + 1),
          tone: (part) => (part.kind === 'value' && part.r === last ? (last === 0 ? 'bad' : 'lit') : undefined) }],
      ],
    };
  };
  return {
    sheets: [hourly, rolled],
    box: { rows: 4.5, cols: 5 },
    still: 4,
    shots: [
      { caption: 'hourly: requests per hour', views: [[hourly, { at, hideHeader: true }], [rolled, hidden]] },
      ...range(4).map(windowAt),
    ],
  };
}

const SEQUENCES: Record<string, () => Sequence> = {
  groupby: () => splitApplyCombine('groupby'),
  agg: () => splitApplyCombine('agg'),
  'pivot-table': pivotTable,
  melt,
  'to-datetime': toDatetime,
  dt: dtHour,
  resample,
  rolling,
};

const DEFAULT_LABEL = 'Rows split into groups by endpoint, each group reduced to its mean, and the means combined into a Series.';
const LABELS: Record<string, string> = {
  groupby: DEFAULT_LABEL,
  agg: 'Rows split into groups by endpoint, each group reduced to a count and a mean.',
  'pivot-table': 'A long table turned into endpoints down the side and hours across, with a mean in each cell.',
  melt: 'A wide table with one column per hour turned into a long table with one row per value.',
  'to-datetime': 'A column of text times converted to datetimes.',
  dt: 'The hour taken out of each datetime in a column.',
  resample: 'Requests split into hour bins and counted, with an empty hour counted as 0.',
  rolling: 'A two-row window sliding down hourly counts, taking the mean of each window.',
};

export function splitApplyCombineFigure(figure: Figure): HTMLElement {
  const highlight = figure.highlight ?? 'groupby';
  const build = SEQUENCES[highlight] ?? (() => splitApplyCombine('groupby'));
  const { shots, sheets, still, box, cellWidth } = build();
  const states: CellState[] = shots.map((shot) => sheetState(shot.views, { ...box, caption: shot.caption }));
  return cellFigure({
    count: sheets.reduce((total, sheet) => total + sheet.count, 0),
    states,
    still,
    cellWidth: cellWidth ?? TABLE_CELL_W,
    height: Math.ceil(box.rows * CELL_H) + 12,
    label: LABELS[highlight] ?? DEFAULT_LABEL,
  });
}
