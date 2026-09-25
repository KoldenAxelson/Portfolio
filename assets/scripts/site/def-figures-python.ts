// The Python for ML figure kinds. def-figures.ts hands every kind it doesn't
// draw itself to renderPythonFigure; each family lives in pyfig/ and is one
// drawing that glossary entries highlight differently (see the table in
// docs/python-for-ml-authoring.md).
//
//   figure: { kind: array-grid, highlight: slicing }
//   figure: { kind: axis-sweep, op: mean, axis: 1, keepdims: true }
//   figure: { kind: axis-sweep, op: matmul }
//   figure: { kind: broadcast, highlight: row | vectorize | ufunc }
//   figure: { kind: view-copy, highlight: view | copy | save }
//   figure: { kind: py-values, highlight: list | dict | set | comprehension | generator | unpacking | args }
//   figure: { kind: frame, highlight: dataframe | series | index | read-csv | loc | isna | … (see pyfig/frame.ts) }
//   figure: { kind: split-apply-combine, highlight: groupby | agg | pivot-table | melt | to-datetime | dt | resample | rolling }
//   figure: { kind: join, highlight: merge | concat }
//   figure: { kind: plot-anatomy, highlight: figure | axes | subplots | grid | plot | legend | log-scale | savefig | … (see pyfig/plot.ts) }
//   figure: { kind: estimator, highlight: estimator | fit | predict | transform | pipeline | data-leakage | … (see pyfig/estimator.ts) }
//   figure: { kind: confusion, highlight: confusion-matrix | accuracy | precision | recall }
//   figure: { kind: graph-backward, highlight: tensor | requires-grad | autograd | backward | grad | gradient | no-grad | detach | backpropagation }
//   figure: { kind: device-move, highlight: device | gpu | to | from-numpy | numpy }
//   figure: { kind: train-loop, highlight: training-loop | optimizer | zero-grad | optimizer-step | epoch | batch | … (see pyfig/train.ts) }
import type { Figure } from './def-figures';
import { arrayGrid, axisSweep, broadcast, viewCopy } from './pyfig/arrays';
import { confusion, estimator } from './pyfig/estimator';
import { frame } from './pyfig/frame';
import { splitApplyCombineFigure } from './pyfig/groups';
import { join } from './pyfig/join';
import { plotAnatomy } from './pyfig/plot';
import { deviceMove, graphBackward } from './pyfig/tensor';
import { trainLoop } from './pyfig/train';
import { pyValues } from './pyfig/values';

const KINDS: Record<string, (figure: Figure) => HTMLElement> = {
  'array-grid': arrayGrid,
  'axis-sweep': axisSweep,
  broadcast,
  'view-copy': viewCopy,
  'py-values': pyValues,
  frame,
  'split-apply-combine': splitApplyCombineFigure,
  join,
  'plot-anatomy': plotAnatomy,
  estimator,
  confusion,
  'graph-backward': graphBackward,
  'device-move': deviceMove,
  'train-loop': trainLoop,
};

export function renderPythonFigure(figure: Figure): HTMLElement | null {
  return KINDS[figure.kind]?.(figure) ?? null;
}
