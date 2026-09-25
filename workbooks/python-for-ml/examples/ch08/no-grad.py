import torch

w = torch.tensor(2.0, requires_grad=True)
loss = (3 * w - 1) ** 2
loss.backward()
w.grad
w -= 0.01 * w.grad  # raises
# Stepping a weight isn't part of the model, so autograd mustn't record it.
with torch.no_grad():
    w -= 0.01 * w.grad
w
(w * 3).requires_grad, w.detach().requires_grad
