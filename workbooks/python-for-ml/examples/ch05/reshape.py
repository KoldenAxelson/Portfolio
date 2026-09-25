import pandas as pd

logs = pd.read_csv("data/logs.csv")
logs["hour"] = pd.to_datetime(logs["time"]).dt.hour
# aggfunc is "mean" unless you pass another
wide = logs.pivot_table(index="endpoint", columns="hour", values="ms")
wide
wide.reset_index().melt(id_vars="endpoint", value_name="mean_ms")
