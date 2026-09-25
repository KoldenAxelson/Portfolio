import pandas as pd

df = pd.read_csv("data/runs.csv", index_col="run")
len(df)
len(df[df["val_loss"] < 0.4]), len(df[df["val_loss"] >= 0.4])
df["val_loss"].isna().sum()
nan = float("nan")
nan < 0.4, nan >= 0.4, nan == nan
