from sklearn.datasets import load_breast_cancer, load_diabetes
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_breast_cancer(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, random_state=0)
# Every classifier has the same fit, predict and score
for clf in [LogisticRegression(), RandomForestClassifier(random_state=0)]:
    model = Pipeline([('scale', StandardScaler()), ('clf', clf)])
    print(type(clf).__name__, model.fit(X_tr, y_tr).score(X_te, y_te))
# A regressor predicts numbers: disease progression a year on
X, y = load_diabetes(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, random_state=0)
reg = LinearRegression().fit(X_tr, y_tr)
reg.predict(X_te[:3]).round(1), y_te[:3]
mean_squared_error(y_te, reg.predict(X_te))
