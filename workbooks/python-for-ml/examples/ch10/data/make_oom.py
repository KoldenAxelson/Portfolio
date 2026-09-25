"""Write Chapter 10's data/oom.csv: made-up training jobs and whether each one
ran out of GPU memory.

    python make_oom.py    (writes examples/ch10/data/oom.csv and ch10/data/oom.csv)

Seeded, so a re-run writes the same file. A job needs about 4 GB plus an amount
that grows with batch_size × seq_len (with some noise), and it runs out of
memory when that need is more than its GPU's mem_gb. The boundary is a curve in
those three columns, so a straight-line model gets most rows right and a small
neural network gets more. 14 rows have no seq_len, for the cleaning step.
"""
from pathlib import Path

import numpy as np
import pandas as pd

ROWS = 400
MISSING = 14
HERE = Path(__file__).resolve().parent
OUTS = [HERE / 'oom.csv', HERE.parents[2] / 'ch10' / 'data' / 'oom.csv']


def make_oom(seed: int = 11) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    mem_gb = rng.choice([16, 24, 40, 80], size=ROWS)
    batch_size = rng.choice([4, 8, 16, 32, 64], size=ROWS)
    seq_len = rng.choice([256, 512, 1024, 2048, 4096], size=ROWS)
    need_gb = 4 + batch_size * seq_len / 512 * rng.normal(1.0, 0.1, size=ROWS)
    frame = pd.DataFrame({
        'mem_gb': mem_gb,
        'batch_size': batch_size,
        'seq_len': pd.array(seq_len, dtype='Int64'),
        'oom': np.where(need_gb > mem_gb, 'yes', 'no'),
    })
    frame.loc[rng.choice(ROWS, size=MISSING, replace=False), 'seq_len'] = pd.NA
    return frame


if __name__ == '__main__':
    frame = make_oom()
    for out in OUTS:
        out.parent.mkdir(parents=True, exist_ok=True)
        frame.to_csv(out, index=False)
