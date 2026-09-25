import pandas as pd

logs = pd.read_csv("data/logs.csv")
logs["time"] = pd.to_datetime(logs["time"])
logs.groupby(logs["time"].dt.hour).size()
logs.resample("h", on="time").size()
