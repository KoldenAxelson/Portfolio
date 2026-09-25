import pandas as pd

df = pd.read_csv("data/runs.csv", index_col="run")
small = df.astype({"lr": "float32"})
import os, tempfile  # hide
os.chdir(tempfile.mkdtemp())  # hide
small.to_csv("runs.csv")
small.to_parquet("runs.parquet")
pd.read_csv("runs.csv", index_col="run")["lr"].dtype
pd.read_parquet("runs.parquet")["lr"].dtype
