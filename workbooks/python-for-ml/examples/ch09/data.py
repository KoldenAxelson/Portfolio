import torch
from torch.utils.data import DataLoader, TensorDataset

X = torch.arange(10.0).reshape(5, 2)
y = torch.tensor([0, 1, 0, 1, 1])
dataset = TensorDataset(X, y)
# A Dataset hands out one example by index.
len(dataset), dataset[0]
# A DataLoader groups examples into batches, in order unless you pass shuffle=True.
for xb, yb in DataLoader(dataset, batch_size=2):
    print(xb.shape, yb.tolist())
