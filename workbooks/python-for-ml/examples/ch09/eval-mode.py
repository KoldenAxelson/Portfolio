import torch
from torch import nn

_ = torch.manual_seed(0)  # hide
model = nn.Sequential(nn.Linear(4, 4), nn.Dropout(p=0.5))
x = torch.ones(1, 4)
# A fresh model is in training mode: dropout zeroes each value with probability 0.5, afresh each call.
model.training
torch.equal(model(x), model(x))
# Evaluation mode turns dropout off, so the same input gives the same output.
model.eval()
torch.equal(model(x), model(x))
# eval() doesn't stop autograd recording; torch.no_grad() does.
model(x).requires_grad
with torch.no_grad():
    print(model(x).requires_grad)
