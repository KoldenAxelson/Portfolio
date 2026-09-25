# Chapter 10's moving example: the whole pipeline, once. pandas loads and
# cleans 400 made-up training jobs (data/make_oom.py), NumPy turns them into
# scaled arrays, scikit-learn sets a baseline, a small PyTorch model tries to
# beat it, and the last step puts the scores side by side. Seeded throughout,
# so every run shows the same numbers; the whole file runs in about a second.

from stepper import Stepper

LOOP = '''
for epoch in range(300):
    optimizer.zero_grad()
    loss = loss_fn(model(Xt), yt)
    loss.backward()
    optimizer.step()
'''
HEADER, *BODY = LOOP.strip('\n').splitlines()

s = Stepper(caption='Pipeline Example')
s.line('import numpy as np')
s.line('import pandas as pd')
s.line('import torch')
s.line('from torch import nn')
s.line('from sklearn.linear_model import LogisticRegression')
s.line('from sklearn.model_selection import train_test_split')
s.line('torch.manual_seed(0)')

# pandas: load and clean
s.step("df = pd.read_csv('data/oom.csv')", label='pd.read_csv', show=['df.shape', 'df.head(4)'],
       note='One row per training job, and whether it ran out of GPU memory. seq_len reads as floats: it has blanks, and NaN is a float.')
s.step('df = df.dropna()', label='dropna', show=['df.shape'],
       note='14 jobs had no seq_len; print the shape after each stage to see what it did.')
s.step("df['oom'] = (df['oom'] == 'yes').astype(int)", label='astype', show=['df.head(4)'],
       note='The label becomes a number: 1 ran out of memory, 0 did not.')

# NumPy: arrays, a split, and scaling fit on the training rows only
s.step("X = df[['mem_gb', 'batch_size', 'seq_len']].to_numpy(dtype=np.float32)", label='to_numpy',
       show=['X.shape', 'X[:4]'], note='float32, the dtype a PyTorch layer expects.')
s.step("y = df['oom'].to_numpy()", label='to_numpy', show=['y.shape', 'y[:4]'])
s.step('X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=0)',
       label='train_test_split', show=['X_train.shape', 'X_test.shape'])
s.step('mean, std = X_train.mean(axis=0), X_train.std(axis=0)', label='mean', show=['mean', 'std'],
       note='One mean and one std per column, from the training rows only.')
s.step('X_train, X_test = (X_train - mean) / std, (X_test - mean) / std', label='broadcasting',
       show=['X_train[:4]'], note='Each column now has mean 0 and std 1 on the training rows; the test rows use the same numbers, so nothing leaks.')

# scikit-learn: the baseline
s.step('baseline = LogisticRegression().fit(X_train, y_train)', label='LogisticRegression',
       show=['baseline.coef_'], note='One weight per column: a straight-line boundary.')
s.step('base_acc = baseline.score(X_test, y_test)', label='accuracy', show=['base_acc'],
       note='The share of test jobs the baseline gets right: the score to beat.')

# PyTorch: a small model trained on the same rows
s.step('Xt, yt = torch.from_numpy(X_train), torch.from_numpy(y_train)', label='torch.from_numpy',
       show=['Xt[:4]', 'yt[:4]'])
s.line('model = nn.Sequential(nn.Linear(3, 16), nn.ReLU(), nn.Linear(16, 2))')
s.line('loss_fn = nn.CrossEntropyLoss()')
s.line('optimizer = torch.optim.AdamW(model.parameters(), lr=0.05)')
s.step('loss_fn(model(Xt), yt)', label='loss', show=['_'], note='Before training: near 0.69 (ln 2), the loss of a 50–50 guess.')
s.line(HEADER, run='pass')
for body in BODY:
    s.line(body, run='pass')
s.step(HEADER, label='training loop', show=['loss'], run=LOOP,
       note='300 epochs, each one batch of every training row (a DataLoader would split them into smaller batches).')
s.line('model.eval()')
s.line('with torch.no_grad():', run='pass')
s.step('    pred = model(torch.from_numpy(X_test)).argmax(dim=1)', label='no_grad', show=['pred.shape'],
       run='with torch.no_grad():\n    pred = model(torch.from_numpy(X_test)).argmax(dim=1)',
       note='One predicted class per test row, with nothing recorded for backward.')
s.step('mlp_acc = (pred.numpy() == y_test).mean().item()', label='accuracy', show=['mlp_acc'],
       note='Scored on the same test rows as the baseline.')

# The comparison
s.step("{'baseline': round(base_acc, 3), 'mlp': round(mlp_acc, 3)}", label='comparison', show=['_'],
       note='Same rows, same split: the difference is the model.')
