// The estimator family: scikit-learn's one pattern drawn as one picture. The
// rows are split into train and test; an estimator box learns from the train
// rows (fit) and then rewrites or labels new rows (transform, predict). Every
// term shows the same drawing with its part lit: the arrow a method draws, the
// box a Pipeline or ColumnTransformer fills, the fold cross-validation holds
// out, the test rows a leak lets in.
//
// The confusion family draws Chapter 7's forest's confusion matrix with the
// cells engine, lighting the cells each metric reads.
//
// Numbers come from Chapter 7's page run: examples/ch07/tuning.py (the fold
// scores and the best C) and examples/ch07/metrics.py (the matrix).
import type { Figure } from '../def-figures';
import { attrs, centredLabel, cycleForever, figureCanvas, reduceMotion, svg } from '../figure-kit';
import type { Place, Tone } from './cells';
import { cellFigure } from './cells';

const WIDTH = 260;
const HEIGHT = 134;
const STEP_MS = 2400;
const STRIPE_H = 12;
const DATA = { x: 10, w: 52 };
const OUT = { x: 204, w: 46 };
const BOX = { x: 86, y: 36, w: 94, h: 60 };
const TRAIN_Y = 18;
const TEST_Y = 90;
const FOLDS = 5;
const TEST_ROWS = 2;
const FOLD_SCORES = ['0.988', '0.988', '0.953', '1.000', '0.976'];
const GRID_C = ['0.01', '0.1', '1', '10'];
const BEST_C = '1';
const BEST_SCORE = '0.981';
const CONFUSION = [[52, 1], [3, 87]];

const PARTS = [
  'whole', 'train', 'test', 'cols', 'box', 'learned', 'pipe', 'lanes', 'grid', 'cand0', 'cand1', 'cand2', 'cand3',
  'fitIn', 'testIn', 'outTrainArrow', 'outTestArrow', 'leak', 'outTrain', 'outTest', 'score',
  'fold0', 'fold1', 'fold2', 'fold3', 'fold4', 'foldScore0', 'foldScore1', 'foldScore2', 'foldScore3', 'foldScore4',
] as const;
type PartName = (typeof PARTS)[number];
const TONES = ['lit', 'alt', 'bad', 'dim'] as const;

interface EstState {
  show: PartName[];
  lit?: PartName[];
  alt?: PartName[];
  bad?: PartName[];
  dim?: PartName[];
  caption: string;
}

/** What the box and its output say in one sequence. */
interface Names {
  model: string;
  learned: string;
  output: string;
  score?: string;
}

interface Sequence { label: string; still: number; names: Names; states: EstState[] }

const text = (x: number, y: number, content: string, className = 'fig-est__text'): SVGTextElement =>
  centredLabel(x, y, className, content);

function rect(x: number, y: number, w: number, h: number, className: string): SVGRectElement {
  const box = svg('rect');
  attrs(box, { x, y, width: w, height: h, rx: 2 });
  box.setAttribute('class', className);
  return box;
}

/** A line with an open arrowhead at (x2, y2); the head points away from (fromX, fromY). */
function arrow(d: string, x2: number, y2: number, fromX: number, fromY: number): SVGElement[] {
  const line = svg('path');
  attrs(line, { d, fill: 'none' });
  line.setAttribute('class', 'fig-est__arrow');
  const angle = Math.atan2(y2 - fromY, x2 - fromX);
  const back = (side: number): string => {
    const x = x2 - 5 * Math.cos(angle) + side * 3 * Math.sin(angle);
    const y = y2 - 5 * Math.sin(angle) - side * 3 * Math.cos(angle);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  };
  const head = svg('path');
  attrs(head, { d: `M ${back(1)} L ${x2} ${y2} L ${back(-1)}`, fill: 'none' });
  head.setAttribute('class', 'fig-est__arrow');
  return [line, head];
}

const straight = (x1: number, y1: number, x2: number, y2: number): SVGElement[] =>
  arrow(`M ${x1} ${y1} L ${x2} ${y2}`, x2, y2, x1, y1);

function stripes(x: number, y: number, w: number, count: number, label: string): SVGElement[] {
  const rows = Array.from({ length: count }, (_, i) => rect(x, y + i * STRIPE_H, w, STRIPE_H, 'fig-est__row'));
  // The label sits inside the middle stripe (the upper-middle one of an even
  // count), never on a line between two.
  const labelY = y + Math.floor(count / 2) * STRIPE_H + STRIPE_H / 2;
  return [...rows, text(x + w / 2, labelY, label, 'fig-est__text is-tag')];
}

/** A box's name, one text per line, centred on (cx, top). */
function nameLines(cx: number, top: number, name: string): SVGElement[] {
  return name.split('\n').map((line, i) => text(cx, top + i * 8, line, 'fig-est__text is-code'));
}

const BOX_CX = BOX.x + BOX.w / 2;
const TRAIN_MID = TRAIN_Y + (FOLDS * STRIPE_H) / 2;
const TEST_MID = TEST_Y + (TEST_ROWS * STRIPE_H) / 2;
const FIT_Y = BOX.y + 18;
const USE_Y = BOX.y + BOX.h - 16;

function innerBoxes(labels: string[], vertical: boolean): SVGElement[] {
  const pad = 5;
  const top = BOX.y + 14;
  const h = BOX.h - 14 - pad;
  if (vertical) {
    const laneH = (h - pad) / labels.length;
    return labels.flatMap((label, i) => {
      const y = top + i * (laneH + pad);
      return [rect(BOX.x + pad, y, BOX.w - 2 * pad, laneH, 'fig-est__inner'), text(BOX_CX, y + laneH / 2, label, 'fig-est__text is-code')];
    });
  }
  const w = (BOX.w - pad * (labels.length + 1)) / labels.length;
  return labels.flatMap((label, i) => {
    const x = BOX.x + pad + i * (w + pad);
    const inner = [rect(x, top, w, h, 'fig-est__inner'), text(x + w / 2, top + h / 2, label, 'fig-est__text is-code')];
    if (i === 0) return inner;
    return [...inner, ...straight(x - pad, top + h / 2, x - 1, top + h / 2)];
  });
}

function drawParts(names: Names): Record<PartName, SVGElement[]> {
  const folds = Array.from({ length: FOLDS }, (_, k) => {
    const y = TRAIN_Y + k * STRIPE_H;
    return [rect(DATA.x, y, DATA.w, STRIPE_H, 'fig-est__row'), text(DATA.x + DATA.w / 2, y + STRIPE_H / 2, `fold ${k + 1}`)];
  });
  const foldScores = FOLD_SCORES.map((score, k) => [text(OUT.x + OUT.w / 2, TRAIN_Y + k * STRIPE_H + STRIPE_H / 2, score, 'fig-est__text is-code')]);
  const candidates = GRID_C.map((c, k) => [text(BOX_CX, BOX.y + 22 + k * 10, `C=${c}`, 'fig-est__text is-code')]);
  const outLabel = names.output;
  return {
    whole: stripes(DATA.x, TRAIN_Y, DATA.w, FOLDS + TEST_ROWS, 'X, y'),
    train: stripes(DATA.x, TRAIN_Y, DATA.w, FOLDS, 'train'),
    test: stripes(DATA.x, TEST_Y, DATA.w, TEST_ROWS, 'test'),
    cols: [
      rect(DATA.x + DATA.w / 2 - 0.5, TRAIN_Y, 1, 2 * STRIPE_H, 'fig-est__divider'),
      rect(DATA.x + DATA.w / 2 - 0.5, TRAIN_Y + 3 * STRIPE_H, 1, 2 * STRIPE_H, 'fig-est__divider'),
      text(DATA.x + DATA.w / 4, TRAIN_Y - 7, 'text'), text(DATA.x + (3 * DATA.w) / 4, TRAIN_Y - 7, 'nums'),
    ],
    box: [rect(BOX.x, BOX.y, BOX.w, BOX.h, 'fig-est__box'), ...nameLines(BOX_CX, BOX.y + 12, names.model)],
    learned: [text(BOX_CX, BOX.y + BOX.h - 10, names.learned, 'fig-est__text is-learned')],
    pipe: [rect(BOX.x, BOX.y, BOX.w, BOX.h, 'fig-est__box'), text(BOX_CX, BOX.y + 8, 'Pipeline', 'fig-est__text is-code'),
      ...innerBoxes(['scale', 'clf'], false)],
    lanes: [rect(BOX.x, BOX.y, BOX.w, BOX.h, 'fig-est__box'), text(BOX_CX, BOX.y + 8, 'ColumnTransformer', 'fig-est__text is-code'),
      ...innerBoxes(['OneHotEncoder', 'StandardScaler'], true)],
    grid: [rect(BOX.x, BOX.y, BOX.w, BOX.h, 'fig-est__box'), text(BOX_CX, BOX.y + 9, 'GridSearchCV', 'fig-est__text is-code')],
    cand0: candidates[0] ?? [],
    cand1: candidates[1] ?? [],
    cand2: candidates[2] ?? [],
    cand3: candidates[3] ?? [],
    fitIn: [...straight(DATA.x + DATA.w + 2, TRAIN_MID, BOX.x - 2, FIT_Y), text((DATA.x + DATA.w + BOX.x) / 2, TRAIN_MID - 12, 'fit')],
    testIn: straight(DATA.x + DATA.w + 2, TEST_MID, BOX.x - 2, USE_Y),
    outTrainArrow: straight(BOX.x + BOX.w + 2, FIT_Y, OUT.x - 2, TRAIN_MID),
    outTestArrow: straight(BOX.x + BOX.w + 2, USE_Y, OUT.x - 2, TEST_MID),
    leak: [...arrow(`M ${DATA.x + DATA.w + 2} ${TEST_Y + 4} C 84 ${TEST_Y - 4}, 70 ${FIT_Y + 8}, ${BOX.x - 2} ${FIT_Y + 2}`,
      BOX.x - 2, FIT_Y + 2, 70, FIT_Y + 8), text(80, TEST_Y + 12, 'leak')],
    outTrain: stripes(OUT.x, TRAIN_Y, OUT.w, FOLDS, outLabel),
    outTest: stripes(OUT.x, TEST_Y, OUT.w, TEST_ROWS, outLabel),
    score: [text(OUT.x + OUT.w / 2, TEST_Y + TEST_ROWS * STRIPE_H + 8, names.score ?? 'score', 'fig-est__text is-code')],
    fold0: folds[0] ?? [], fold1: folds[1] ?? [], fold2: folds[2] ?? [], fold3: folds[3] ?? [], fold4: folds[4] ?? [],
    foldScore0: foldScores[0] ?? [], foldScore1: foldScores[1] ?? [], foldScore2: foldScores[2] ?? [],
    foldScore3: foldScores[3] ?? [], foldScore4: foldScores[4] ?? [],
  };
}

const SPLIT: PartName[] = ['train', 'test'];
const UNFITTED: PartName[] = [...SPLIT, 'box'];
const FITTED: PartName[] = [...UNFITTED, 'fitIn', 'learned'];
const USED: PartName[] = [...FITTED, 'testIn', 'outTestArrow', 'outTest'];
const USE_LIT: PartName[] = ['testIn', 'outTestArrow', 'outTest'];
const FOLD_PARTS: PartName[] = ['fold0', 'fold1', 'fold2', 'fold3', 'fold4'];
const SCORE_PARTS: PartName[] = ['foldScore0', 'foldScore1', 'foldScore2', 'foldScore3', 'foldScore4'];
const CANDIDATES: PartName[] = ['cand0', 'cand1', 'cand2', 'cand3'];

/** Made, fitted, then used: the life of any estimator. */
function lifeSequence(label: string, names: Names, captions: [string, string, string], still = 2): Sequence {
  return { label, still, names, states: [
    { show: UNFITTED, caption: captions[0] },
    { show: FITTED, lit: ['fitIn', 'learned'], caption: captions[1] },
    { show: USED, lit: USE_LIT, caption: captions[2] },
  ] };
}

const MODEL: Names = { model: 'LogisticRegression', learned: 'coef_', output: 'ŷ' };
const SCALER: Names = { model: 'StandardScaler', learned: 'mean_ scale_', output: 'scaled' };
const REGRESSOR: Names = { model: 'LinearRegression', learned: 'coef_ intercept_', output: 'ŷ', score: 'MSE' };
const FOREST: Names = { model: 'RandomForest\nClassifier', learned: 'estimators_', output: 'ŷ' };
// Chapter 7's cross-validation scores come from a scaled Pipeline, not a bare LogisticRegression.
const SCALED_MODEL: Names = { ...MODEL, model: 'StandardScaler +\nLogisticRegression' };

function foldState(k: number): EstState {
  const held = FOLD_PARTS[k] ?? 'fold0';
  return {
    show: [...FOLD_PARTS, 'test', 'box', 'fitIn', ...SCORE_PARTS.slice(0, k + 1)],
    lit: [...FOLD_PARTS.filter((part) => part !== held), 'fitIn'],
    alt: [held, SCORE_PARTS[k] ?? 'foldScore0'],
    dim: ['test'],
    caption: `fold ${k + 1}: fit on the other four, scored on this one: ${FOLD_SCORES[k]}`,
  };
}

function candidateState(k: number): EstState {
  return {
    show: [...SPLIT, 'grid', ...CANDIDATES],
    lit: [CANDIDATES[k] ?? 'cand0', 'train'],
    dim: ['test'],
    caption: `C=${GRID_C[k]}: scored by 5-fold cross-validation on the training rows`,
  };
}

const SEQUENCES: Record<string, () => Sequence> = {
  estimator: () => lifeSequence('An estimator: settings in, fit to learn, then use.', MODEL, [
    'model = LogisticRegression(): settings only, nothing learned',
    'model.fit(X_train, y_train): what it learned is stored as coef_',
    'model.predict(X_test): the learned coef_ applied to new rows',
  ]),
  fit: () => ({ label: 'fit: learn from the training rows.', still: 1, names: MODEL, states: [
    { show: UNFITTED, caption: 'model = LogisticRegression(): not fitted yet' },
    { show: FITTED, lit: ['fitIn', 'learned', 'train'], caption: 'model.fit(X_train, y_train): learns coef_ from these rows' },
  ] }),
  predict: () => ({ label: 'predict: a label for each new row.', still: 1, names: MODEL, states: [
    { show: FITTED, caption: 'a fitted model' },
    { show: USED, lit: USE_LIT, caption: 'model.predict(X_test): one predicted label per row' },
  ] }),
  transform: () => ({ label: 'transform: rewrite rows with what fit learned.', still: 1, names: SCALER, states: [
    { show: FITTED, caption: 'scaler.fit(X_train): mean_ and scale_ learned' },
    { show: USED, lit: USE_LIT, caption: 'scaler.transform(X_test): rescaled with the training mean_ and scale_' },
  ] }),
  'fit-transform': () => ({ label: 'fit_transform: fit, then transform the same rows.', still: 1, names: SCALER, states: [
    { show: UNFITTED, caption: 'scaler = StandardScaler()' },
    { show: [...FITTED, 'outTrainArrow', 'outTrain'], lit: ['fitIn', 'learned', 'outTrainArrow', 'outTrain'],
      caption: 'scaler.fit_transform(X_train): learn, then rescale these rows' },
    { show: [...USED, 'outTrain'], lit: USE_LIT, caption: 'then scaler.transform(X_test): no second fit' },
  ] }),
  'standard-scaler': () => lifeSequence('StandardScaler: centre each column on 0, spread 1.', SCALER, [
    'scaler = StandardScaler()',
    "fit: each column's mean_ and scale_, from the training rows",
    'transform: (x − mean_) / scale_, column by column',
  ]),
  'one-hot-encoder': () => ({ label: 'OneHotEncoder: one 0/1 column per category.', still: 2,
    names: { model: 'OneHotEncoder', learned: 'categories_', output: '0/1' }, states: [
      { show: UNFITTED, caption: 'enc = OneHotEncoder()' },
      { show: FITTED, lit: ['fitIn', 'learned'], caption: 'enc.fit(X_train): the categories it saw, in categories_' },
      { show: USED, lit: USE_LIT, caption: 'enc.transform(X_test): a 1 in the column of each row\'s category' },
      { show: [...FITTED, 'testIn'], bad: ['testIn', 'test'],
        caption: "a category fit never saw raises by default; handle_unknown='ignore' leaves its columns at 0" },
    ] }),
  pipeline: () => ({ label: 'Pipeline: steps fit and used in order, as one estimator.', still: 2, names: MODEL, states: [
    { show: [...SPLIT, 'pipe'], caption: "Pipeline([('scale', StandardScaler()), ('clf', …)])" },
    { show: [...SPLIT, 'pipe', 'fitIn'], lit: ['fitIn', 'pipe', 'train'],
      caption: 'fit(X_train, y_train): scale fit on these rows, its output fits clf' },
    { show: [...SPLIT, 'pipe', 'fitIn', ...USE_LIT], lit: USE_LIT,
      caption: 'predict(X_test): scaled with the training mean_, then predicted' },
  ] }),
  'column-transformer': () => ({ label: 'ColumnTransformer: each column list to its own transformer.', still: 1,
    names: { model: 'ColumnTransformer', learned: '', output: 'outputs' }, states: [
      { show: [...SPLIT, 'cols', 'lanes'], caption: 'text columns and number columns need different steps' },
      { show: [...SPLIT, 'cols', 'lanes', 'fitIn', 'outTrainArrow', 'outTrain'], lit: ['lanes', 'fitIn', 'outTrainArrow', 'outTrain'],
        caption: 'text → OneHotEncoder, nums → StandardScaler, outputs side by side' },
    ] }),
  'train-test-split': () => ({ label: 'train_test_split: hold rows out before anything is fit.', still: 1, names: MODEL, states: [
    { show: ['whole'], caption: 'X, y: every row' },
    { show: SPLIT, lit: ['train'], alt: ['test'], caption: 'train_test_split(X, y): shuffled, a quarter held out by default' },
  ] }),
  'test-set': () => ({ label: 'The test set: rows fit never sees.', still: 1, names: MODEL, states: [
    { show: FITTED, lit: ['train', 'fitIn'], caption: 'fit sees the training rows only' },
    { show: USED, lit: ['test', ...USE_LIT], caption: 'the test rows: scored once, at the end' },
  ] }),
  'data-leakage': () => ({ label: 'Data leakage: test rows reach fit.', still: 1, names: SCALER, states: [
    { show: FITTED, lit: ['fitIn', 'train'], caption: 'right: the scaler is fit on the training rows only' },
    { show: [...FITTED, 'leak'], bad: ['leak', 'test', 'learned'], caption: 'wrong: fit before the split, so the test rows set mean_ too' },
  ] }),
  'cross-val-score': () => ({ label: 'cross_val_score: fit and score once per fold.', still: FOLDS - 1, names: SCALED_MODEL,
    states: Array.from({ length: FOLDS }, (_, k) => foldState(k)) }),
  'grid-search-cv': () => ({ label: 'GridSearchCV: every setting scored, the best refit.', still: GRID_C.length,
    names: MODEL, states: [
      ...GRID_C.map((_, k) => candidateState(k)),
      { show: [...SPLIT, 'grid', ...CANDIDATES, 'fitIn'], lit: [CANDIDATES[GRID_C.indexOf(BEST_C)] ?? 'cand2', 'fitIn', 'train'],
        dim: ['test'], caption: `best C=${BEST_C} (${BEST_SCORE}), refit on all the training rows` },
    ] }),
  'linear-regression': () => lifeSequence('LinearRegression: a straight-line fit that predicts numbers.', REGRESSOR, [
    'reg = LinearRegression()',
    'reg.fit(X_train, y_train): coef_ and intercept_, least squares',
    'reg.predict(X_test): a number per row',
  ]),
  'logistic-regression': () => lifeSequence('LogisticRegression: a linear classifier.', MODEL, [
    'clf = LogisticRegression(): C=1.0, max_iter=100',
    'clf.fit(X_train, y_train): one weight per feature, in coef_',
    'clf.predict(X_test): the class with the higher probability',
  ]),
  'random-forest': () => lifeSequence('RandomForestClassifier: many trees, averaged.', FOREST, [
    'forest = RandomForestClassifier(random_state=0)',
    'forest.fit: 100 trees, each on a resample of the rows',
    'forest.predict: the class with the highest mean probability',
  ]),
  'mean-squared-error': () => ({ label: 'mean_squared_error: how far the numbers land.', still: 1, names: REGRESSOR, states: [
    { show: USED, caption: 'pred = reg.predict(X_test)' },
    { show: [...USED, 'score'], lit: ['score', 'outTest', 'test'], caption: 'mean_squared_error(y_test, pred): mean of (y − ŷ)²' },
  ] }),
};

export function estimator(figure: Figure): HTMLElement {
  const sequence = (SEQUENCES[figure.highlight ?? 'estimator'] ?? SEQUENCES.estimator!)();
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig fig-py';
  const canvas = figureCanvas(WIDTH, HEIGHT, 'fig-py__canvas fig-est', sequence.label);
  const caption = document.createElement('figcaption');
  caption.className = 'fig-py__caption';
  const captionCode = document.createElement('code');
  caption.appendChild(captionCode);

  const drawn = drawParts(sequence.names);
  // Only the parts some state shows go into the SVG.
  const used = new Set(sequence.states.flatMap((state) => state.show));
  const groups = new Map<PartName, SVGGElement>();
  for (const name of PARTS) {
    if (!used.has(name)) continue;
    const group = svg('g');
    group.setAttribute('class', 'fig-est__part');
    group.append(...drawn[name]);
    canvas.appendChild(group);
    groups.set(name, group);
  }

  const paint = (index: number): void => {
    const state = sequence.states[index % sequence.states.length];
    if (!state) return;
    for (const [name, group] of groups) {
      group.classList.toggle('is-hidden', !state.show.includes(name));
      for (const tone of TONES) group.classList.toggle(`is-${tone}`, state[tone]?.includes(name) ?? false);
    }
    captionCode.textContent = state.caption;
    canvas.setAttribute('aria-label', `${sequence.label} ${state.caption}`);
  };

  paint(reduceMotion() ? sequence.still : 0);
  wrap.append(canvas, caption);
  if (!reduceMotion() && sequence.states.length > 1) cycleForever(canvas, STEP_MS, paint);
  return wrap;
}

// ── confusion: the matrix and the cells each metric reads ────────────────

const LABELS = ['', 'pred 0', 'pred 1', 'true 0', '', '', 'true 1', '', ''];
const isHead = (i: number): boolean => i < 3 || i % 3 === 0;
const cellAt = (i: number): [number, number] => [Math.floor(i / 3) - 1, (i % 3) - 1];
const valueOf = (i: number): string => {
  if (isHead(i)) return LABELS[i] ?? '';
  const [r, c] = cellAt(i);
  return String(CONFUSION[r]?.[c] ?? '');
};
const place = (i: number): Place => ({ r: Math.floor(i / 3), c: i % 3 });

const count = (r: number, c: number): number => CONFUSION[r]?.[c] ?? 0;
const TOTAL = count(0, 0) + count(0, 1) + count(1, 0) + count(1, 1);
const share = (part: number, whole: number): string => (part / whole).toFixed(3);

interface Reading { label: string; caption: string; tone: (r: number, c: number) => Tone }

const READINGS: Record<string, Reading> = {
  'confusion-matrix': { label: 'A confusion matrix: rows are the truth, columns the prediction.',
    caption: 'right answers on the diagonal, mistakes off it',
    tone: (r, c) => (r === c ? 'lit' : 'bad') },
  accuracy: { label: 'Accuracy: the diagonal over every row.',
    caption: `accuracy: (${count(0, 0)} + ${count(1, 1)}) / ${TOTAL} = ${share(count(0, 0) + count(1, 1), TOTAL)}`,
    tone: (r, c) => (r === c ? 'lit' : 'dim') },
  precision: { label: 'Precision for class 0: its column, what was predicted 0.',
    caption: `precision for 0: ${count(0, 0)} / (${count(0, 0)} + ${count(1, 0)}) = ${share(count(0, 0), count(0, 0) + count(1, 0))}`,
    tone: (r, c) => (c !== 0 ? 'dim' : r === 0 ? 'lit' : 'bad') },
  recall: { label: 'Recall for class 0: its row, what truly was 0.',
    caption: `recall for 0: ${count(0, 0)} / (${count(0, 0)} + ${count(0, 1)}) = ${share(count(0, 0), count(0, 0) + count(0, 1))}`,
    tone: (r, c) => (r !== 0 ? 'dim' : c === 0 ? 'lit' : 'bad') },
};

export function confusion(figure: Figure): HTMLElement {
  const reading = READINGS[figure.highlight ?? 'confusion-matrix'] ?? READINGS['confusion-matrix']!;
  const plain = (i: number): Tone => (isHead(i) ? 'head' : '');
  const read = (i: number): Tone => (isHead(i) ? 'head' : reading.tone(...cellAt(i)));
  return cellFigure({
    count: 9, cellWidth: 44, still: 1, label: reading.label,
    states: [
      { rows: 3, cols: 3, place, value: valueOf, tone: plain, caption: 'confusion_matrix(y_te, pred)' },
      { rows: 3, cols: 3, place, value: valueOf, tone: read, caption: reading.caption },
    ],
  });
}
