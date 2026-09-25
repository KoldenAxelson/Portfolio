"""Chapter 8 workbook: Tensors and Autograd. Solutions."""
import torch

# ── Part 1: shape predictor ──────────────────────────────────────────────
# t = torch.arange(12).reshape(3, 4)

PREDICTIONS = {
    "t[1]": (4,),
    "t[:, 1:3]": (3, 2),
    "t.T": (4, 3),
    "t.reshape(2, -1)": (2, 6),
    "t @ t.T": (3, 3),
    "t.sum(dim=0)": (4,),
    "t.sum(dim=1, keepdim=True)": (3, 1),
    "t.sum()": (),
    "torch.zeros(2, 5)": (2, 5),
    "torch.randn((4,))": (4,),
    "torch.tensor(5.0)": (),
    "torch.tensor([[1, 2, 3]])": (1, 3),
}


# ── Part 2: a gradient by hand, then by autograd ─────────────────────────
# loss = (w * x + b - y) ** 2

def hand_gradients(w: float, x: float, b: float, y: float) -> tuple[float, float]:
    """(d loss / d w, d loss / d b), worked out on paper and written in plain
    Python: no torch. Use the chain rule on the square: the derivative of
    e ** 2 is 2 * e, times the derivative of e itself."""
    error = w * x + b - y
    return 2 * error * x, 2 * error


def autograd_gradients(w: float, x: float, b: float, y: float) -> tuple[float, float]:
    """The same two gradients, from autograd: make w and b tensors that require
    grad, compute the loss, call backward, and read .grad. Return two Python
    floats (a one-value tensor's .item() gives its number)."""
    w_t = torch.tensor(w, requires_grad=True)
    b_t = torch.tensor(b, requires_grad=True)
    loss = (w_t * x + b_t - y) ** 2
    loss.backward()
    return w_t.grad.item(), b_t.grad.item()


# ── Part 3: fix the bug ──────────────────────────────────────────────────

def descend(w0: float, xs: torch.Tensor, ys: torch.Tensor, lr: float, steps: int) -> list[float]:
    """Gradient descent on one weight w, for the model ys ≈ w * xs.

    Each step computes loss = mean((w * xs - ys) ** 2), gets its gradient with
    backward, and moves w a step of lr against it. Returns w after every step,
    as floats.
    """
    w = torch.tensor(w0, requires_grad=True)
    history = []
    for _ in range(steps):
        w.grad = None  # backward adds to .grad, so clear the last step's gradient first
        loss = ((w * xs - ys) ** 2).mean()
        loss.backward()
        with torch.no_grad():
            w -= lr * w.grad
        history.append(w.item())
    return history
