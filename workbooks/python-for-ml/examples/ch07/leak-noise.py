# The leak made big: a step that reads the labels, fit before the split, on
# data with no signal at all. Honest accuracy on random labels is about 0.5.

import numpy as np
from sklearn.feature_selection import SelectKBest
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

# 200 rows of pure noise, labels drawn at random
rng = np.random.default_rng(0)
X = rng.normal(size=(200, 2000))
y = rng.integers(0, 2, size=200)
# Wrong: keep the 20 columns that best match y, using every row
X_best = SelectKBest(k=20).fit_transform(X, y)
X_tr, X_te, y_tr, y_te = train_test_split(X_best, y, random_state=0)
LogisticRegression().fit(X_tr, y_tr).score(X_te, y_te)
# Right: the selection is a Pipeline step, fit on the training rows only
X_tr, X_te, y_tr, y_te = train_test_split(X, y, random_state=0)
model = Pipeline([('select', SelectKBest(k=20)), ('clf', LogisticRegression())])
model.fit(X_tr, y_tr).score(X_te, y_te)
