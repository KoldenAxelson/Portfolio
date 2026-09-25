from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score
from sklearn.model_selection import train_test_split

X, y = load_breast_cancer(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, random_state=0)
pred = RandomForestClassifier(random_state=0).fit(X_tr, y_tr).predict(X_te)
# Rows are the true class, columns the prediction: 0 malignant, 1 benign
confusion_matrix(y_te, pred)
accuracy_score(y_te, pred)
# By default the positive class is 1, here benign
precision_score(y_te, pred), recall_score(y_te, pred)
# The class you care about is malignant, 0
precision_score(y_te, pred, pos_label=0), recall_score(y_te, pred, pos_label=0)
