from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_breast_cancer(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, random_state=0)
model = Pipeline([('scale', StandardScaler()), ('clf', LogisticRegression())])
# Five folds of the training rows: fit on four, score the fifth, five times
scores = cross_val_score(model, X_tr, y_tr)
scores.round(3), scores.mean().round(3)
# Every C in the grid, scored the same way; a step's setting is step__name
search = GridSearchCV(model, {'clf__C': [0.01, 0.1, 1, 10]})
search.fit(X_tr, y_tr)
search.best_params_, round(search.best_score_, 3)
# refit=True: the best setting refit on all training rows, then the test set, once
search.score(X_te, y_te)
