# Chapter 7's moving example: one baseline classifier built twice. The first
# version scales every row before the split, so the test rows help set the
# scaler; the second puts the scaler in a Pipeline, which fits it on the
# training rows only.

from stepper import Stepper

s = Stepper(caption='Baseline Example')
s.line('from sklearn.datasets import load_breast_cancer')
s.line('from sklearn.linear_model import LogisticRegression')
s.line('from sklearn.metrics import accuracy_score')
s.line('from sklearn.model_selection import train_test_split')
s.line('from sklearn.pipeline import Pipeline')
s.line('from sklearn.preprocessing import StandardScaler')
s.line('X, y = load_breast_cancer(return_X_y=True)')
s.line('# Wrong: the scaler sees every row, test rows included.')
s.step('scaler = StandardScaler()', label='estimator', show=['X.shape', 'scaler'],
       note='X is 569 tumours by 30 measurements. The scaler is an estimator that has learned nothing yet.')
s.step('X_scaled = scaler.fit_transform(X)', label='fit_transform', show=['X[:3, :4]', 'X_scaled[:3, :4]'],
       note='fit learns each column\'s mean and spread from all 569 rows; transform rescales with them.')
s.step('X_tr, X_te, y_tr, y_te = train_test_split(X_scaled, y, random_state=0)', label='train_test_split',
       show=['X_tr.shape', 'X_te.shape'], note='By default a quarter of the rows go to the test set.')
s.step('LogisticRegression().fit(X_tr, y_tr).score(X_te, y_te)', label='data leakage', show=['_'],
       note='A score, but the 143 test rows already shaped the scaling it was measured through.')
s.line('# Right: split first, and let a Pipeline fit the scaler on the training rows.')
s.step('X_tr, X_te, y_tr, y_te = train_test_split(X, y, random_state=0)', label='train_test_split',
       show=['X_tr.shape', 'X_te.shape'], note='The same rows as before, unscaled.')
s.step("model = Pipeline([('scale', StandardScaler()), ('clf', LogisticRegression())])", label='Pipeline',
       show=['model'], note='Two steps, one estimator: fit runs them in order, predict passes rows through both.')
s.step('model.fit(X_tr, y_tr)', label='fit',
       show=["scaler.mean_[:4]", "model['scale'].mean_[:4]", 'X_tr[:, :4].mean(axis=0)'],
       note='The first scaler learned from all rows; the Pipeline\'s learned from the 426 training rows only.')
s.step('model.predict(X_te[:12])', label='predict', show=['_', 'y_te[:12]'],
       note='Test rows go in raw; the Pipeline scales them with the training mean and spread, then predicts.')
s.step('accuracy_score(y_te, model.predict(X_te))', label='accuracy_score', show=['_'],
       note='The share of test rows predicted right, on rows the model and its scaler never saw.')
