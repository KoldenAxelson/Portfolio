"""Write the Chapter 7 packet's data/jobs.csv: made-up training jobs and
whether each one failed.

    python make_jobs.py    (writes ../../../ch07/data/jobs.csv)

Seeded, so a re-run writes the same file. A job's chance of failing rises
with its batch size and its length, and depends on the GPU and the framework,
so a model needs the text columns one-hot encoded to do well.
"""
from pathlib import Path

import numpy as np
import pandas as pd

ROWS = 600
OUT = Path(__file__).resolve().parents[3] / 'ch07' / 'data' / 'jobs.csv'
GPU_RISK = {'a100': 0.0, 'h100': -1.5, 'l4': 2.0, 't4': 3.5}
FRAMEWORK_RISK = {'pytorch': 0.0, 'jax': 1.5}


def make_jobs(seed: int = 2) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    gpu = rng.choice(list(GPU_RISK), size=ROWS)
    framework = rng.choice(list(FRAMEWORK_RISK), size=ROWS, p=[0.7, 0.3])
    batch_size = rng.choice([16, 32, 64, 128, 256], size=ROWS)
    hours = rng.gamma(2.0, 3.0, size=ROWS).round(1)
    logit = (
        -3.6
        + np.array([GPU_RISK[g] for g in gpu])
        + np.array([FRAMEWORK_RISK[f] for f in framework])
        + 0.012 * batch_size
        + 0.08 * hours
    )
    failed = rng.random(ROWS) < 1 / (1 + np.exp(-logit))
    return pd.DataFrame({
        'gpu': gpu, 'framework': framework, 'batch_size': batch_size, 'hours': hours, 'failed': failed.astype(int),
    })


if __name__ == '__main__':
    OUT.parent.mkdir(parents=True, exist_ok=True)
    make_jobs().to_csv(OUT, index=False)
