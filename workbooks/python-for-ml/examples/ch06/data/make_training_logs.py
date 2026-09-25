"""Write the made-up training logs Chapter 6 plots. Seeded, so every run of
this script writes the same files:

    python make_training_logs.py

  examples/ch06/data/training-log.csv   the page's run: 12 epochs, validation lowest at epoch 7
  ch06/data/training-log.csv            the packet's run: 20 epochs, another seed
  ch06/data/runs.csv                    three more runs for the packet to diagnose

Each loss is a smooth curve plus a little noise, rounded to three places.
"""
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
PACKET = HERE.parents[2] / 'ch06' / 'data'


def overfitting_run(epochs, turn, seed):
    """Both losses fall; from `turn` on, validation climbs while train keeps falling."""
    rng = np.random.default_rng(seed)
    epoch = np.arange(1, epochs + 1)
    decay = np.exp(-0.32 * epoch)
    train = 0.25 + 2.2 * decay + rng.normal(0, 0.008, epochs)
    val = 0.42 + 2.0 * decay + 0.03 * np.clip(epoch - turn, 0, None) ** 1.4 + rng.normal(0, 0.008, epochs)
    return epoch, train, val


def training_log(epochs, turn, seed):
    epoch, train, val = overfitting_run(epochs, turn, seed)
    return pd.DataFrame({'epoch': epoch, 'train_loss': train.round(3), 'val_loss': val.round(3)})


def three_runs(epochs=15, seed=66):
    """An underfit run, an overfit one and one whose learning rate is too high."""
    rng = np.random.default_rng(seed)
    epoch = np.arange(1, epochs + 1)

    def noise(scale):
        return rng.normal(0, scale, epochs)

    _, over_train, over_val = overfitting_run(epochs, turn=6, seed=seed)
    # Too simple a model: both losses stop early, high and close together.
    plateau = 1.35 + 0.95 * np.exp(-0.45 * epoch)
    under_train, under_val = plateau + noise(0.01), plateau + 0.06 + noise(0.01)
    # Steps too big: the loss jumps around and drifts up instead of settling.
    swing = 0.5 * np.where(epoch % 2 == 0, 1, -1)
    jumpy_train = 2.3 + 0.12 * epoch + swing * np.sqrt(epoch) / 2 + noise(0.08)
    jumpy_val = jumpy_train + 0.1 + noise(0.08)
    columns = {
        'epoch': epoch,
        'a_train': under_train, 'a_val': under_val,
        'b_train': over_train, 'b_val': over_val,
        'c_train': jumpy_train, 'c_val': jumpy_val,
    }
    return pd.DataFrame(columns).round(3)


if __name__ == '__main__':
    PACKET.mkdir(parents=True, exist_ok=True)
    training_log(12, turn=5, seed=6).to_csv(HERE / 'training-log.csv', index=False)
    training_log(20, turn=10, seed=60).to_csv(PACKET / 'training-log.csv', index=False)
    three_runs().to_csv(PACKET / 'runs.csv', index=False)
