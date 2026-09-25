import pandas as pd

df = pd.read_csv('data/oom.csv').dropna()
X = df[['mem_gb', 'batch_size', 'seq_len']].to_numpy()
# Double brackets select a one-column table, not a Series.
y = df[['oom']].to_numpy()
# Print the shapes after each stage.
X.shape, y.shape
# Or assert them: the run stops at the first one that's wrong.
assert X.shape == (len(df), 3), X.shape
assert y.shape == (len(df),), y.shape  # raises
