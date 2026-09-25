import pandas as pd

web1 = pd.DataFrame({"endpoint": ["/login", "/search"], "ms": [120, 340]})
web2 = pd.DataFrame({"endpoint": ["/login"], "ms": [95]})
pd.concat([web1, web2])
pd.concat([web1, web2], ignore_index=True)
