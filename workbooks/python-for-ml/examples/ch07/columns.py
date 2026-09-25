import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

jobs = pd.DataFrame({'gpu': ['a100', 'h100', 'a100', 'l4'], 'hours': [2.0, 8.0, 4.0, 1.0]})
enc = OneHotEncoder(sparse_output=False)
enc.fit_transform(jobs[['gpu']])
enc.categories_
# A category fit never saw
enc.transform(pd.DataFrame({'gpu': ['b200']}))  # raises
# Each list of columns gets its own transformer; the results sit side by side
prep = ColumnTransformer([
    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False), ['gpu']),
    ('scale', StandardScaler(), ['hours']),
])
prep.fit_transform(jobs).round(2)
prep.transform(pd.DataFrame({'gpu': ['b200'], 'hours': [4.0]})).round(2)
