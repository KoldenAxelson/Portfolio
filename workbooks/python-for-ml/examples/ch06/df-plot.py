import os  # hide
import tempfile  # hide
from pathlib import Path

import pandas as pd

log = pd.read_csv('data/training-log.csv', index_col='epoch')
ax = log.plot(title='Train vs validation loss', ylabel='loss')
ax.get_xlabel(), [text.get_text() for text in ax.get_legend().get_texts()]
ax.figure
scratch = tempfile.TemporaryDirectory()  # hide
os.chdir(scratch.name)  # hide
ax.figure.savefig('loss.png', dpi=150)
Path('loss.png').read_bytes()[:4]
