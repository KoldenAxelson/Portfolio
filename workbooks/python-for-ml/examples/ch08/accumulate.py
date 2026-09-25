import torch

w = torch.tensor(2.0, requires_grad=True)
# The same loss, three times over. d/dw (3w - 1)² = 6(3w - 1) = 30.
for step in range(3):
    loss = (3 * w - 1) ** 2
    loss.backward()
    print(w.grad)
# Clear the gradient before each backward.
for step in range(3):
    w.grad = None
    loss = (3 * w - 1) ** 2
    loss.backward()
    print(w.grad)
