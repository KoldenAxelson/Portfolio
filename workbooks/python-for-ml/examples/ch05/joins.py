import pandas as pd

logs = pd.read_csv("data/logs.csv")
owners = pd.read_csv("data/owners.csv")
len(logs), len(owners)
# /upload has no owner, and nobody called /billing
[len(logs.merge(owners, on="endpoint", how=how)) for how in ("inner", "left", "outer")]
