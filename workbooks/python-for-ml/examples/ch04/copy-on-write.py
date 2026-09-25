import warnings
import pandas as pd

df = pd.read_csv("data/runs.csv", index_col="run")
losses = df["val_loss"]
losses.iloc[0] = 0.0
losses.iloc[0], df.loc["r1", "val_loss"]
with warnings.catch_warnings(record=True) as caught:
    df["epochs"]["r3"] = 10
[w.category.__name__ for w in caught]
df.loc["r3", "epochs"]
df.loc["r3", "epochs"] = 10
df.loc["r3", "epochs"]
