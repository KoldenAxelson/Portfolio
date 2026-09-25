import pandas as pd

df = pd.read_csv("data/runs.csv", index_col="run")
df.head(3)
df.info()
df.describe()
