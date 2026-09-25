"""Build a code stepper's states by running its code.

A stepper file (examples/chNN/name.stepper.py) describes a short snippet one
line at a time. Each line really runs, and the panels beside it are the values
it produced, so a stepper can't show an array the code wouldn't make.

    from stepper import Stepper

    s = Stepper(caption='Array Example')
    s.line('import numpy as np')                           # runs; not a step
    s.step('a = np.arange(12).reshape(3, 4)', label='ndarray', show=['a'])
    s.step('a[1:, ::2]', label='slicing', show=['a', '_'],
           pick={'a': 'a[1:, ::2]'})
    s.step('a[a % 2 == 0]', label='boolean mask', show=['a', '_'],
           mask={'a': 'a % 2 == 0'})

step(code, label, show, pick=None, mask=None, note=None, run=None)
  label  what the caption names ("Array Example — slicing")
  show   expressions to draw as panels, in order. '_' is the value the line
         itself evaluated to, titled with the line (pick and mask can name it
         too).
  pick   {name: expr}: light the cells of `name` that `expr` selects. The
         expression runs with `name` swapped for an array of cell numbers, so
         a slice or a fancy index lights exactly the cells it reads. For a
         DataFrame or Series the expression runs on the value itself and
         lights its result's rows and columns: a column, a row or a block.
         A scalar lights the one cell a label or position lookup read
         (df.loc['r3', 'lr'], df.iat[2, 1]); a scalar computed from the
         values, like df['lr'].max(), can't be traced to a cell.
  mask   {name: expr}: light the cells of `name` where `expr` is True. On a
         DataFrame a mask with one value per row (a boolean Series) lights
         whole rows; a missing value in a mask counts as False.
  note   one sentence under the panels.
  run    the Python that really runs for this line, when the line shown can't
         run on its own: a loop header, `for xb, yb in loader:`, is stepped by
         running `xb, yb = next(batches)`. line() takes it too. An indented
         line (a loop body) runs dedented.

A step whose code is already in the snippet lights that line again rather than
adding it, so a loop body can be stepped through once per pass.

Values drawn: ndarrays and tensors up to 3-D (a grid, or layers of grids),
DataFrames and Series (a table, missing values written the way pandas prints
them), anything else as text. A tensor's title line names its torch dtype and
says when it requires grad; a single-number tensor is drawn as its repr, which
shows requires_grad and grad_fn the way the prompt would.
"""
import textwrap

import numpy as np

_built = []
FLOAT_DIGITS = 2
MAX_CELLS = 48


def collected():
    if len(_built) != 1:
        raise RuntimeError(f'a stepper file must build exactly one Stepper (built {len(_built)})')
    return _built[0].data


def _is_frame(value):
    return type(value).__name__ in ('DataFrame', 'Series')


def _is_tensor(value):
    return type(value).__module__.startswith('torch') and hasattr(value, 'numpy')


def _as_array(value):
    if isinstance(value, np.ndarray):
        return value
    if _is_tensor(value):
        return value.detach().cpu().numpy()
    return None


def _tensor_meta(tensor):
    meta = f'shape {tuple(tensor.shape)} · {tensor.dtype}'
    return meta + ' · requires_grad' if tensor.requires_grad else meta


def _cell(value):
    if isinstance(value, (bool, np.bool_)):
        return str(bool(value))
    if isinstance(value, (float, np.floating)):
        if np.isnan(value):
            return 'nan'
        return np.format_float_positional(value, precision=FLOAT_DIGITS, unique=True, trim='.')
    if isinstance(value, (int, np.integer)):
        return str(int(value))
    return str(value)


def _grid(array):
    if array.ndim == 0:
        return [[_cell(array.item())]]
    if array.ndim == 1:
        return [[_cell(v) for v in array]]
    return [[_cell(v) for v in row] for row in array]


def _array_panel(title, array, lit, meta=None):
    if array.size > MAX_CELLS:
        raise ValueError(f'{title}: {array.size} cells is too many to draw (max {MAX_CELLS})')
    panel = {'title': title, 'meta': meta or f'shape {tuple(array.shape)} · {array.dtype}', 'kind': 'grid'}
    if array.ndim == 3:
        panel['layers'] = [_grid(layer) for layer in array]
    else:
        panel['cells'] = _grid(array)
    if lit is not None:
        panel['lit'] = lit
    return panel


def _frame_cell(value):
    """A table cell as pandas prints it: NaN, <NA> and NaT for missing values,
    and a float keeps its decimal point (10.0), so a float column never looks
    like an integer one."""
    if value is None or type(value).__name__ in ('NAType', 'NaTType'):
        return str(value)
    if isinstance(value, (float, np.floating)):
        if np.isnan(value):
            return 'NaN'
        return np.format_float_positional(value, precision=FLOAT_DIGITS, unique=True, trim='0')
    return _cell(value)


def _count(n, noun):
    return f'{n} {noun}' if n == 1 else f'{n} {noun}s'


def _frame_panel(title, frame, lit):
    if _is_dataframe(frame):
        meta = f'{_count(frame.shape[0], "row")} × {_count(frame.shape[1], "column")}'
    else:
        meta = f'Series · {_count(len(frame), "row")} · {frame.dtype}'
        frame = frame.to_frame(name=frame.name if frame.name is not None else '')
    panel = {
        'title': title,
        'meta': meta,
        'kind': 'table',
        'columns': [str(c) for c in frame.columns],
        'index': [str(i) for i in frame.index],
        'rows': [[_frame_cell(v) for v in row] for row in frame.itertuples(index=False)],
    }
    if frame.index.name is not None:
        panel['index_name'] = str(frame.index.name)
    if lit is not None:
        panel['lit'] = lit
    return panel


def _frame_axes(frame):
    """(row labels, column labels) of a DataFrame, or of a Series drawn as one column."""
    columns = list(frame.columns) if _is_dataframe(frame) else [frame.name]
    return list(frame.index), columns


def _is_dataframe(value):
    return type(value).__name__ == 'DataFrame'


def _coord_keys(coords, ndim):
    """"row,col" (or "layer,row,col") per cell: the form the shortcode and the
    script both test membership with. A 1-D array is drawn as one row."""
    if ndim == 1:
        return [f'0,{int(c[0])}' for c in coords]
    return [','.join(str(int(v)) for v in c) for c in coords]


def _cell_coords(flat_indices, shape):
    numbers = np.arange(int(np.prod(shape))).reshape(shape)
    return _coord_keys(np.argwhere(np.isin(numbers, flat_indices)), len(shape))


def _selected_labels(frame, selection, expression):
    """(rows, columns) of `frame` that a DataFrame or Series result came from."""
    rows, columns = _frame_axes(frame)
    if _is_dataframe(selection):
        return list(selection.index), list(selection.columns)
    labels = list(selection.index)
    if not _is_dataframe(frame):
        return labels, columns
    if selection.name in columns and set(labels) <= set(rows):
        return labels, [selection.name]
    if selection.name in rows and set(labels) <= set(columns):
        return [selection.name], labels
    raise ValueError(f'pick {expression!r}: cannot tell which rows and columns this Series came from')


def _frame_mask(frame, hits):
    """Keys of the cells a boolean DataFrame, or a boolean Series over the rows, marks True."""
    rows, columns = _frame_axes(frame)
    marked = hits.fillna(False).astype(bool)
    if _is_dataframe(hits):
        return [f'{rows.index(r)},{columns.index(c)}'
                for r in marked.index for c in marked.columns if marked.at[r, c]]
    return [f'{rows.index(r)},{c}' for r in marked.index[marked.to_numpy()] for c in range(len(columns))]


class Stepper:
    def __init__(self, caption):
        self.namespace = {'__name__': '__stepper__'}
        self.data = {'caption': caption, 'code': [], 'steps': []}
        _built.append(self)

    def line(self, code, run=None):
        """Run a line that belongs to the snippet but isn't a step of its own."""
        self._run(run or code)
        self.data['code'].append(code)

    def step(self, code, label, show, pick=None, mask=None, note=None, run=None):
        result = self._run(run or code)
        if code not in self.data['code']:
            self.data['code'].append(code)
        self.namespace['_'] = result
        lit = self._lit(pick or {}, mask or {})
        panels = []
        for expression in show:
            value = eval(expression, self.namespace)
            title = code if expression == '_' else expression
            panels.append(self._panel(title, value, lit.get(expression)))
        step = {'line': self.data['code'].index(code), 'label': label, 'panels': panels}
        if note:
            step['note'] = note
        self.data['steps'].append(step)

    def _run(self, code):
        code = textwrap.dedent(code)
        try:
            return eval(compile(code, '<stepper>', 'eval'), self.namespace)
        except SyntaxError:
            exec(compile(code, '<stepper>', 'exec'), self.namespace)
            return None

    def _lit(self, pick, mask):
        lit = {}
        for name, expression in pick.items():
            value = self.namespace[name]
            if _is_frame(value):
                lit[name] = self._frame_pick(name, value, expression)
                continue
            array = _as_array(value)
            numbers = np.arange(array.size).reshape(array.shape)
            selected = eval(expression, {**self.namespace, name: numbers})
            lit[name] = _cell_coords(np.asarray(selected).ravel(), array.shape)
        for name, expression in mask.items():
            hits = eval(expression, self.namespace)
            if _is_frame(hits):
                lit[name] = _frame_mask(self.namespace[name], hits)
                continue
            hits = np.asarray(hits)
            lit[name] = _coord_keys(np.argwhere(hits), hits.ndim)
        return lit

    def _frame_pick(self, name, frame, expression):
        """Cells of `frame` that `expression` selects, found from its result's
        labels. A scalar has no labels, so the expression runs again on a
        same-shaped frame of cell numbers, which gives the cell it read."""
        selection = eval(expression, self.namespace)
        rows, columns = _frame_axes(frame)
        if len(set(rows)) != len(rows) or len(set(columns)) != len(columns):
            raise ValueError(f'pick {name!r}: its row and column labels must be unique')
        if not _is_frame(selection):
            numbers = np.arange(len(rows) * len(columns)).reshape(len(rows), len(columns))
            if _is_dataframe(frame):
                numbered = type(frame)(numbers, index=frame.index, columns=frame.columns)
            else:
                numbered = type(frame)(numbers[:, 0], index=frame.index, name=frame.name)
            cell = int(eval(expression, {**self.namespace, name: numbered}))
            return [f'{cell // len(columns)},{cell % len(columns)}']
        picked_rows, picked_cols = _selected_labels(frame, selection, expression)
        return [f'{rows.index(r)},{columns.index(c)}' for r in picked_rows for c in picked_cols]

    def _panel(self, title, value, lit):
        if _is_frame(value):
            return _frame_panel(title, value, lit)
        if _is_tensor(value) and value.ndim == 0:
            return {'title': title, 'meta': _tensor_meta(value), 'kind': 'text', 'text': repr(value)}
        if _is_tensor(value):
            return _array_panel(title, _as_array(value), lit, _tensor_meta(value))
        array = _as_array(value)
        if array is not None:
            return _array_panel(title, array, lit)
        return {'title': title, 'kind': 'text', 'text': repr(value)}
