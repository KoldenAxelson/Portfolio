# Chapter 10: the comparison plot. The hidden lines rerun the stepper's
# pipeline (same data, seed and split), so these are the stepper's scores.

import matplotlib.pyplot as plt
import numpy as np  # hide
import pandas as pd  # hide
import torch  # hide
from torch import nn  # hide
from sklearn.linear_model import LogisticRegression  # hide
from sklearn.model_selection import train_test_split  # hide
_ = torch.manual_seed(0)  # hide
df = pd.read_csv('data/oom.csv').dropna()  # hide
df['oom'] = (df['oom'] == 'yes').astype(int)  # hide
X = df[['mem_gb', 'batch_size', 'seq_len']].to_numpy(dtype=np.float32)  # hide
y = df['oom'].to_numpy()  # hide
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=0)  # hide
mean, std = X_train.mean(axis=0), X_train.std(axis=0)  # hide
X_train, X_test = (X_train - mean) / std, (X_test - mean) / std  # hide
base_acc = LogisticRegression().fit(X_train, y_train).score(X_test, y_test)  # hide
Xt, yt = torch.from_numpy(X_train), torch.from_numpy(y_train)  # hide
model = nn.Sequential(nn.Linear(3, 16), nn.ReLU(), nn.Linear(16, 2))  # hide
loss_fn = nn.CrossEntropyLoss()  # hide
optimizer = torch.optim.AdamW(model.parameters(), lr=0.05)  # hide
for epoch in range(300):  # hide
    optimizer.zero_grad()  # hide
    loss = loss_fn(model(Xt), yt)  # hide
    loss.backward()  # hide
    optimizer.step()  # hide
_ = model.eval()  # hide
with torch.no_grad():  # hide
    pred = model(torch.from_numpy(X_test)).argmax(dim=1)  # hide
mlp_acc = (pred.numpy() == y_test).mean().item()  # hide

# y_test, base_acc and mlp_acc are the stepper's: the same seeded run.
# Always answering "no" is the floor any model must beat.
scores = {
    'always "no"': (y_test == 0).mean().item(),
    'logistic regression': base_acc,
    'MLP': mlp_acc,
}
fig, ax = plt.subplots(figsize=(6, 2.6), layout='constrained')
bars = ax.barh(list(scores), list(scores.values()))
ax.bar_label(bars, fmt='%.3f', padding=4)
ax.margins(x=0.15)
ax.invert_yaxis()
ax.set_xlabel(f'accuracy on the {len(y_test)} test jobs')
ax.set_title('Same rows, three answers')
fig
