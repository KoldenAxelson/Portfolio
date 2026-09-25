import pandas as pd

logs = pd.read_csv("data/logs.csv")
owners = pd.read_csv("data/owners.csv")
# /login moved to a new team, and the old row was never removed
handover = pd.DataFrame({"endpoint": ["/login"], "team": ["platform"]})
owners = pd.concat([owners, handover], ignore_index=True)
owners
len(logs.merge(owners, on="endpoint", how="left"))
logs.merge(owners, on="endpoint", how="left", validate="many_to_one")  # raises
