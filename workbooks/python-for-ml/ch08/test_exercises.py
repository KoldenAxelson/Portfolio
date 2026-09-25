"""Checks for the Chapter 8 workbook. Run `pytest` in this folder."""
import math
import numbers

import pytest
import torch

import exercises

t = torch.arange(12).reshape(3, 4)

# Why each shape is what it is, shown when a prediction is wrong.
WHY = {
    "t[1]": "a single index drops its axis, leaving one row of 4",
    "t[:, 1:3]": "a slice keeps its axis: all 3 rows, columns 1 and 2",
    "t.T": "transpose reverses the axes, so (3, 4) becomes (4, 3)",
    "t.reshape(2, -1)": "12 values in 2 rows leaves 6 columns",
    "t @ t.T": "(3, 4) @ (4, 3): the inner 4s meet, the outer 3 and 3 are left",
    "t.sum(dim=0)": "dim=0 collapses the rows, leaving one total per column",
    "t.sum(dim=1, keepdim=True)": "dim=1 collapses the columns, and keepdim=True keeps that axis with length 1",
    "t.sum()": "with no dim, sum adds everything into a single number, shape ()",
    "torch.zeros(2, 5)": "torch.zeros takes the shape as separate numbers (or one tuple)",
    "torch.randn((4,))": "the shape is the tuple (4,): four random numbers in a row",
    "torch.tensor(5.0)": "a single number makes a tensor with no axes, shape ()",
    "torch.tensor([[1, 2, 3]])": "one list inside another: 1 row of 3",
}

# What an error means, found from its message, so a crash fails with a reason.
# (exercise, text in the message, hint); an exercise of None fits any of them.
MESSAGE_HINTS = [
    ("autograd_gradients", "does not require grad and does not have a grad_fn",
     "backward found nothing to work out: make w and b tensors with requires_grad=True, "
     "torch.tensor(w, requires_grad=True), and compute the loss from them."),
    ("autograd_gradients", "'NoneType' object has no attribute 'item'",
     "A .grad is None: make both w and b with requires_grad=True, and read .grad after loss.backward()."),
    ("descend", "does not require grad and does not have a grad_fn",
     "w stopped being the tensor that requires grad: w = w - ... makes a new tensor. "
     "Step it in place, w -= lr * w.grad, inside torch.no_grad()."),
    (None, "Only Tensors of floating point",
     "Only float tensors can require grad: pass floats, torch.tensor(float(w), requires_grad=True)."),
    (None, "a leaf Variable that requires grad is being used in an in-place operation",
     "Changing w in place is recorded by autograd unless you do it inside `with torch.no_grad():`."),
    (None, "Can't call numpy() on Tensor that requires grad",
     "Read one number with .item(), or detach first: t.detach().numpy()."),
    (None, "'NoneType' object has no attribute 'zero_'",
     "w.grad is None until the first backward, so w.grad.zero_() fails on step one. Set w.grad = None instead."),
    (None, "for *: 'float' and 'NoneType'",
     "w.grad was None when w was stepped: clear the gradient before loss.backward(), not between backward and the step."),
    (None, "Trying to backward through the graph a second time",
     "Each backward needs a fresh graph: compute the loss again inside the loop before calling backward."),
]


def slip_hint(name, error):
    message = str(error)
    return next((hint for exercise, text, hint in MESSAGE_HINTS if exercise in (None, name) and text in message), "")


def call(function, *args):
    """Run an exercise, turning an unwritten one, or one that raises, into a plain failure."""
    try:
        return function(*args)
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")
    except (RuntimeError, TypeError, AttributeError, ValueError) as error:
        first_line = (str(error).strip().splitlines() or [""])[0].rstrip(".")
        pytest.fail(f"{function.__name__} raised {type(error).__name__}: {first_line}. {slip_hint(function.__name__, error)}".rstrip())


def expect_two_floats(got, name):
    if not (isinstance(got, tuple) and len(got) == 2):
        pytest.fail(f"{name} returned {got!r}; expected a tuple of two numbers, (d loss / d w, d loss / d b).")
    for value in got:
        if isinstance(value, torch.Tensor):
            pytest.fail(f"{name} returned a tensor, {value!r}; return plain floats: w.grad.item() gives the number.")
        if value is None:
            pytest.fail(f"{name} returned None for a gradient: .grad stays None until loss.backward() has run.")
        if not isinstance(value, numbers.Real):
            pytest.fail(f"{name} returned {value!r} ({type(value).__name__}); expected a float.")


# ── Part 1 ───────────────────────────────────────────────────────────────

@pytest.mark.parametrize("expression", list(exercises.PREDICTIONS))
def test_predict_shape(expression):
    guess = exercises.PREDICTIONS[expression]
    if guess is None:
        pytest.fail(f"Predict the shape of {expression} in PREDICTIONS (a tuple, e.g. (3, 4)).")
    if not isinstance(guess, tuple):
        pytest.fail(f"{expression}: write the shape as a tuple, like (4,) or (3, 4), not {guess!r}.")
    actual = tuple(eval(expression, {"t": t, "torch": torch}).shape)
    assert guess == actual, f"{expression}: you predicted {guess}, but it is {actual}: {WHY[expression]}."


# ── Part 2 ───────────────────────────────────────────────────────────────

# (w, x, b, y) and the gradients 2 * e * x and 2 * e, with e = w * x + b - y.
CASES = [
    ((2.0, 3.0, 1.0, 4.0), (18.0, 6.0)),     # e = 3
    ((0.5, -2.0, 0.25, 1.0), (7.0, -3.5)),   # e = -1.75: x is negative, so the signs differ
]


@pytest.mark.parametrize(("inputs", "expected"), CASES)
def test_hand_gradients(inputs, expected):
    got = call(exercises.hand_gradients, *inputs)
    expect_two_floats(got, "hand_gradients")
    w, x, b, y = inputs
    error = w * x + b - y
    assert math.isclose(got[1], expected[1], rel_tol=1e-9), (
        f"hand_gradients{inputs}: d loss / d b is {got[1]}; expected {expected[1]}. "
        f"The error e = w*x + b - y is {error}, and d(e²)/db = 2 * e * de/db, where de/db = 1."
    )
    assert math.isclose(got[0], expected[0], rel_tol=1e-9), (
        f"hand_gradients{inputs}: d loss / d w is {got[0]}; expected {expected[0]}. "
        f"The error e is {error}, and d(e²)/dw = 2 * e * de/dw, where de/dw = x = {x}."
    )


@pytest.mark.parametrize(("inputs", "expected"), CASES)
def test_autograd_gradients(inputs, expected, monkeypatch):
    calls = []
    real_backward = torch.Tensor.backward

    def counting_backward(self, *args, **kwargs):
        calls.append(1)
        return real_backward(self, *args, **kwargs)

    monkeypatch.setattr(torch.Tensor, "backward", counting_backward)
    got = call(exercises.autograd_gradients, *inputs)
    expect_two_floats(got, "autograd_gradients")
    assert calls, "autograd_gradients returned numbers without calling backward: let autograd work them out, loss.backward()."
    assert all(math.isclose(g, e, rel_tol=1e-5) for g, e in zip(got, expected)), (
        f"autograd_gradients{inputs} returned {got}; expected {expected}, the same as by hand. "
        "Compute loss = (w * x + b - y) ** 2 from tensors w and b made with requires_grad=True, "
        "call loss.backward() once, and return (w.grad.item(), b.grad.item())."
    )


# ── Part 3 ───────────────────────────────────────────────────────────────

def expected_steps(w, xs, ys, lr, steps, *, clears):
    """The steps descend should take, worked out without autograd; with
    clears=False, the steps it takes when gradients pile up across backward calls."""
    history, grad = [], 0.0
    for _ in range(steps):
        fresh = sum(2 * (w * x - y) * x for x, y in zip(xs, ys)) / len(xs)
        grad = fresh if clears else grad + fresh
        w -= lr * grad
        history.append(w)
    return history


DESCENT = [
    (0.0, [1.0, 2.0, 3.0], [2.0, 4.0, 6.0], 0.05, 4),     # the best w is 2
    (1.0, [0.5, -1.0, 2.0, 1.5], [-1.0, 1.5, -3.0, -2.5], 0.1, 5),  # the best w is about -1.57
]


@pytest.mark.parametrize(("w0", "xs", "ys", "lr", "steps"), DESCENT)
def test_descend(w0, xs, ys, lr, steps):
    got = call(exercises.descend, w0, torch.tensor(xs), torch.tensor(ys), lr, steps)
    if not isinstance(got, list) or len(got) != steps:
        pytest.fail(f"descend returned {got!r}; expected a list of {steps} floats, w after each step.")
    if not all(isinstance(value, numbers.Real) for value in got):
        pytest.fail(f"descend returned {got!r}; expected plain floats: w.item() gives w's number.")
    right = expected_steps(w0, xs, ys, lr, steps, clears=True)
    piled_up = expected_steps(w0, xs, ys, lr, steps, clears=False)
    if all(math.isclose(g, p, rel_tol=1e-4, abs_tol=1e-6) for g, p in zip(got, piled_up)):
        pytest.fail(
            f"descend moved w to {[round(v, 4) for v in got]}; expected {[round(v, 4) for v in right]}. "
            "From step 2 on, each step used the sum of every gradient so far: backward adds to w.grad "
            "rather than replacing it. Clear it (w.grad = None) at the start of each step, before loss.backward()."
        )
    assert all(math.isclose(g, r, rel_tol=1e-4, abs_tol=1e-6) for g, r in zip(got, right)), (
        f"descend moved w to {[round(v, 4) for v in got]}; expected {[round(v, 4) for v in right]}. "
        "Each step: clear w.grad, compute loss = ((w * xs - ys) ** 2).mean(), call loss.backward(), "
        "then w -= lr * w.grad inside torch.no_grad()."
    )
