import warnings
import pandas as pd

# 1 and 2 September, written day first
stamps = pd.Series(["01/09/2026 09:05", "02/09/2026 10:15"])
with warnings.catch_warnings(record=True) as caught:
    parsed = pd.to_datetime(stamps)
parsed.dt.month.tolist(), len(caught)
pd.to_datetime(stamps, format="%d/%m/%Y %H:%M").dt.month.tolist()
