import matplotlib.pyplot as plt
import pandas as pd

log = pd.read_csv('data/training-log.csv', index_col='epoch')
fig, ax = plt.subplots(figsize=(6, 3.6), layout='constrained')
# Each drawing call also returns what it drew (a list of lines, a Text);
# the page leaves those out and shows the figure.
ax.plot(log.index, log['train_loss'], label='train')
ax.plot(log.index, log['val_loss'], label='validation')
best = log['val_loss'].idxmin()
ax.axvline(best, color='gray', linestyle='--', label=f'lowest validation (epoch {best})')
ax.set_xlabel('epoch')
ax.set_ylabel('loss')
ax.set_title('Train vs validation loss')
ax.legend()
fig
