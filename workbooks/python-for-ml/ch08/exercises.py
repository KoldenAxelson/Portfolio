"""Chapter 8 workbook: Tensors and Autograd.

Three parts. Replace every `None` prediction and every
`raise NotImplementedError`, fix the function marked FIX, then run `pytest`.
Everything runs on the CPU.
"""
import torch

# ── Part 1: shape predictor ──────────────────────────────────────────────
# `t` is torch.arange(12).reshape(3, 4), the tensor twin of Chapter 2's `a`.
# For each expression, write the shape it produces as a tuple, WITHOUT running
# it first: (3, 4), (4,), and so on. A single number has shape (). PyTorch
# prints a shape as torch.Size([3, 4]); write it as the tuple (3, 4). Then
# check yourself with `pytest -k predict_shape`.

PREDICTIONS = {
    "t[1]": None,
    "t[:, 1:3]": None,
    "t.T": None,
    "t.reshape(2, -1)": None,
    "t @ t.T": None,
    "t.sum(dim=0)": None,
    "t.sum(dim=1, keepdim=True)": None,
    "t.sum()": None,
    "torch.zeros(2, 5)": None,
    "torch.randn((4,))": None,
    "torch.tensor(5.0)": None,
    "torch.tensor([[1, 2, 3]])": None,
}


# ── Part 2: a gradient by hand, then by autograd ─────────────────────────
# One prediction y_hat = w * x + b and its squared error against the target y:
#
#     loss = (w * x + b - y) ** 2
#
# All four inputs are Python floats.

def hand_gradients(w: float, x: float, b: float, y: float) -> tuple[float, float]:
    """(d loss / d w, d loss / d b), worked out on paper and written in plain
    Python: no torch. Use the chain rule on the square: the derivative of
    e ** 2 is 2 * e, times the derivative of e itself."""
    raise NotImplementedError("hand_gradients: let e = w * x + b - y; differentiate e ** 2 with respect to w, then b")


def autograd_gradients(w: float, x: float, b: float, y: float) -> tuple[float, float]:
    """The same two gradients, from autograd: make w and b tensors that require
    grad, compute the loss, call backward, and read .grad. Return two Python
    floats (a one-value tensor's .item() gives its number)."""
    raise NotImplementedError("autograd_gradients: torch.tensor(w, requires_grad=True), loss.backward(), then w.grad.item()")


# ── Part 3: fix the bug ──────────────────────────────────────────────────

def descend(w0: float, xs: torch.Tensor, ys: torch.Tensor, lr: float, steps: int) -> list[float]:
    """FIX: gradient descent on one weight w, for the model ys ≈ w * xs.

    Each step computes loss = mean((w * xs - ys) ** 2), gets its gradient with
    backward, and moves w a step of lr against it. Returns w after every step,
    as floats. The steps come out wrong from the second one on: find out why.
    """
    w = torch.tensor(w0, requires_grad=True)
    history = []
    for _ in range(steps):
        loss = ((w * xs - ys) ** 2).mean()
        loss.backward()
        with torch.no_grad():
            w -= lr * w.grad
        history.append(w.item())
    return history
