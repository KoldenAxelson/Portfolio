"""Checks for the Chapter 9 workbook. Run `pytest` in this folder."""
import copy
import numbers
import time

import numpy as np
import pytest
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

import exercises

TARGET_ACCURACY = 0.90
TIME_LIMIT_S = 30

# What an error means, found from its message, so a crash fails with a reason.
# (exercise, text in the message, hint); an exercise of None fits any of them.
MESSAGE_HINTS = [
    ("predict", "must have the same dtype",
     "The batch's dtype doesn't match the model's weights, which nn.Linear makes float32 by default. Move the batch to match the "
     "model, not the model to match the batch: batch.to(torch.float32), or batch.to(device, dtype) to match both."),
    ("predict", "expected m1 and m2 to have the same dtype",
     "The batch's dtype doesn't match the model's weights, which nn.Linear makes float32 by default. Move the batch to match the "
     "model, not the model to match the batch: batch.to(torch.float32)."),
    ("load_classifier", "Weights only load failed",
     "torch.load refuses whole pickled models by default: the file holds a state_dict, so load it into "
     "build_model() with model.load_state_dict(torch.load(path))."),
    ("load_classifier", "Error(s) in loading state_dict",
     "The saved weights don't fit the model: load them into a fresh build_model(), the same shape that saved them."),
    (None, "expected target dtype to be Long",
     "CrossEntropyLoss wants int64 class indices as targets: pass y as it comes, not y.float() or y.int()."),
    (None, "0D or 1D target tensor expected",
     "CrossEntropyLoss wants the targets as shape (n,), one class index per row, not (n, 1)."),
    (None, "mat1 and mat2 shapes cannot be multiplied",
     "A layer got the wrong number of features: the first nn.Linear takes 2 inputs, and each layer's "
     "out_features must equal the next one's in_features."),
    (None, "does not require grad and does not have a grad_fn",
     "backward found nothing to work out: compute the loss from the model's output, outside torch.no_grad()."),
    (None, "object has no attribute 'parameters'",
     "The optimizer needs the model's weights: torch.optim.AdamW(model.parameters(), lr=...)."),
    (None, "optimizer can only optimize Tensors",
     "Give the optimizer the model's weights, not the model: torch.optim.AdamW(model.parameters(), lr=...)."),
    (None, "'method' object is not iterable",
     "Call parameters with its brackets: torch.optim.AdamW(model.parameters(), lr=...)."),
    ("train_classifier", "must match the size of tensor",
     "The loss got scores and targets of different shapes: for classes, use nn.CrossEntropyLoss, which takes "
     "(n, 2) scores and (n,) class indices."),
    (None, "cannot assign module before Module.__init__() call",
     "Call super().__init__() first in your model's __init__, before setting any layers."),
    (None, "optimizer got an empty parameter list",
     "The model has no weights: build its layers with nn.Linear, inside nn.Sequential or as attributes of an nn.Module."),
]


def slip_hint(name, error):
    message = str(error)
    return next((hint for exercise, text, hint in MESSAGE_HINTS if exercise in (None, name) and text in message), "")


def call(function, *args):
    """Run an exercise (or a model it returned), turning an unwritten one, or one that raises, into a plain failure."""
    name = getattr(function, "__name__", "the model")
    try:
        return function(*args)
    except NotImplementedError as todo:
        pytest.fail(f"Not written yet: {todo}")
    except Exception as error:  # the hint table explains the common ones
        first_line = (str(error).strip().splitlines() or [""])[0].rstrip(".")
        pytest.fail(f"{name} raised {type(error).__name__}: {first_line}. {slip_hint(name, error)}".rstrip())


def checkerboard(n, seed):
    """n points in the square from -1 to 1; class 1 where x1 and x2 share a sign."""
    generator = torch.Generator().manual_seed(seed)
    X = torch.rand(n, 2, generator=generator) * 2 - 1
    return X, (X[:, 0] * X[:, 1] > 0).long()


def expect_float(got, name):
    if isinstance(got, torch.Tensor):
        pytest.fail(f"{name} returned a tensor, {got!r}; return a plain float: .item() gives a tensor's number.")
    if not isinstance(got, numbers.Real) or isinstance(got, bool):
        pytest.fail(f"{name} returned {got!r} ({type(got).__name__}); expected a float.")


# ── Part 1: train_epoch ──────────────────────────────────────────────────

def small_run():
    """A seeded model, 24 rows in three batches of 8 (in order), and plain SGD."""
    torch.manual_seed(0)
    model = nn.Sequential(nn.Linear(2, 4), nn.ReLU(), nn.Linear(4, 2))
    X, y = checkerboard(24, seed=3)
    loader = DataLoader(TensorDataset(X, y), batch_size=8)
    return model, loader


def reference_epoch(model, loader, *, clears):
    """What one epoch should do, and, with clears=False, what it does when
    gradients pile up across batches. Returns the mean batch loss."""
    optimizer = torch.optim.SGD(model.parameters(), lr=0.5)
    loss_fn = nn.CrossEntropyLoss()
    losses = []
    for xb, yb in loader:
        if clears:
            optimizer.zero_grad()
        loss = loss_fn(model(xb), yb)
        loss.backward()
        optimizer.step()
        losses.append(loss.item())
    return sum(losses) / len(losses)


def same_weights(a, b):
    return all(torch.allclose(p, q, atol=1e-6) for p, q in zip(a.parameters(), b.parameters()))


def test_train_epoch():
    model, loader = small_run()
    start, right, piled_up = copy.deepcopy(model), copy.deepcopy(model), copy.deepcopy(model)
    right_loss = reference_epoch(right, loader, clears=True)
    reference_epoch(piled_up, loader, clears=False)
    optimizer = torch.optim.SGD(model.parameters(), lr=0.5)
    got = call(exercises.train_epoch, model, loader, nn.CrossEntropyLoss(), optimizer)
    expect_float(got, "train_epoch")
    if same_weights(model, start):
        pytest.fail(
            "train_epoch left every weight where it was. optimizer.step() skips a weight whose .grad is None, "
            "so zero_grad must come before loss.backward(), never between backward and step."
        )
    if same_weights(model, piled_up):
        pytest.fail(
            "train_epoch's weights match a loop whose gradients pile up: from the second batch on, each step "
            "used the sum of every batch's gradient so far, because backward adds to .grad. "
            "Call optimizer.zero_grad() at the start of each batch."
        )
    assert same_weights(model, right), (
        "train_epoch's weights don't match one epoch of the five-step loop: for each batch, "
        "optimizer.zero_grad(), logits = model(xb), loss = loss_fn(logits, yb), loss.backward(), optimizer.step()."
    )
    assert abs(got - right_loss) < 1e-5, (
        f"train_epoch returned {got}; expected {right_loss:.6f}, the mean of the three batch losses, "
        "each read with loss.item() before the next batch."
    )


# ── Part 1: accuracy ─────────────────────────────────────────────────────

def dropout_model():
    """A hand-set model that sorts every point by the sign of x1, exactly, in
    evaluation mode. Its hidden layer is four copies each of relu(x1) and
    relu(-x1), with dropout after it, so in training mode some class-1 rows lose
    all four of their copies, tie at 0 and are misclassified."""
    first = nn.Linear(2, 8, bias=False)
    last = nn.Linear(8, 2, bias=False)
    with torch.no_grad():
        first.weight.copy_(torch.tensor([[1.0, 0.0], [-1.0, 0.0]] * 4))
        last.weight.copy_(torch.tensor([[0.0, 1.0] * 4, [1.0, 0.0] * 4]))
    return nn.Sequential(first, nn.ReLU(), nn.Dropout(p=0.5), last)


def test_accuracy():
    model = dropout_model()
    X, _ = checkerboard(400, seed=4)
    y = (X[:, 0] > 0).long()
    loader = DataLoader(TensorDataset(X, y), batch_size=50)
    model.train()  # as it is straight after a training epoch
    first = call(exercises.accuracy, model, loader)
    expect_float(first, "accuracy")
    second = call(exercises.accuracy, model, loader)
    assert first == 1.0 and second == 1.0, (
        f"accuracy gave {first} and then {second}; this model scores every point right, 1.0, every time. "
        "It was still in training mode, so its dropout zeroed random values while scoring. "
        "Call model.eval() before scoring (train_epoch's model.train() switches it back)."
    )


# ── Part 1: predict ──────────────────────────────────────────────────────

@pytest.mark.parametrize("dtype", [np.float64, np.float32])
def test_predict(dtype):
    model = dropout_model()
    features = np.array([[0.5, 0.2], [-0.3, 0.9], [0.1, -0.4], [-0.8, -0.1]], dtype=dtype)
    got = call(exercises.predict, model, features)
    if not isinstance(got, torch.Tensor):
        pytest.fail(f"predict returned {got!r} ({type(got).__name__}); expected a tensor of class indices.")
    assert got.shape == (4,), f"predict returned shape {tuple(got.shape)}; expected (4,): one class per row."
    assert got.dtype == torch.int64, f"predict returned {got.dtype}; expected torch.int64, as argmax gives."
    assert got.tolist() == [1, 0, 1, 0], (
        f"predict returned {got.tolist()}; expected [1, 0, 1, 0]: class 1 where x1 is positive."
    )


# ── Part 2: build it ─────────────────────────────────────────────────────

def test_build_model():
    model = call(exercises.build_model)
    if not isinstance(model, nn.Module):
        pytest.fail(f"build_model returned a value of type {type(model).__name__}; expected an nn.Module, such as an nn.Sequential of layers.")
    layers = list(model.modules())
    assert any(isinstance(layer, nn.ReLU) for layer in layers), (
        "build_model has no nn.ReLU: without one between them, linear layers make one straight-line "
        "boundary, and no straight line separates the checkerboard's classes."
    )
    assert sum(isinstance(layer, nn.Linear) for layer in layers) >= 2, (
        "build_model needs at least two nn.Linear layers, a hidden one and an output one, with the ReLU between."
    )
    scores = call(model, torch.zeros(5, 2))
    assert tuple(scores.shape) == (5, 2), (
        f"build_model's model turned 5 rows of 2 features into shape {tuple(scores.shape)}; expected (5, 2): "
        "two raw scores per row, one for each class, with no softmax."
    )
    if (scores >= 0).all() and torch.allclose(scores.sum(dim=1), torch.ones(5)):
        pytest.fail(
            "build_model's scores are positive and add up to 1 in every row: the model ends in a softmax. "
            "Leave it out: nn.CrossEntropyLoss applies log-softmax itself, and softmaxed scores give a wrong loss without an error."
        )


def test_train_classifier():
    X, y = checkerboard(800, seed=1)
    X_test, y_test = checkerboard(400, seed=2)
    torch.manual_seed(0)
    start = time.perf_counter()
    model = call(exercises.train_classifier, X, y)
    seconds = time.perf_counter() - start
    if not isinstance(model, nn.Module):
        pytest.fail(f"train_classifier returned a value of type {type(model).__name__}; expected the trained model alone, an nn.Module.")
    model.eval()
    with torch.no_grad():
        scores = call(model, X_test)
    if tuple(scores.shape) != (400, 2):
        pytest.fail(f"The model turned 400 test rows into shape {tuple(scores.shape)}; expected (400, 2), two scores per row.")
    test_accuracy_score = (scores.argmax(dim=1) == y_test).float().mean().item()
    assert test_accuracy_score >= TARGET_ACCURACY, (
        f"The trained model scored {test_accuracy_score:.1%} on 400 unseen points; the target is "
        f"{TARGET_ACCURACY:.0%}. Check each batch runs all five steps (zero_grad first), and train for "
        "more epochs or with a larger lr (AdamW with lr=0.01 for 30 or so epochs of batches of 32 is plenty)."
    )
    assert seconds < TIME_LIMIT_S, (
        f"train_classifier took {seconds:.0f} s; keep it under {TIME_LIMIT_S} s: fewer epochs, "
        "or a larger batch_size so each epoch has fewer steps."
    )


def test_load_classifier(tmp_path):
    torch.manual_seed(1)
    saved = call(exercises.build_model)
    if not isinstance(saved, nn.Module):
        pytest.fail("build_model must work first: it returns the model load_classifier fills.")
    path = tmp_path / "model.pt"
    torch.save(saved.state_dict(), path)
    torch.manual_seed(2)  # so a fresh model's own random weights can't pass by chance
    loaded = call(exercises.load_classifier, path)
    if not isinstance(loaded, nn.Module):
        pytest.fail(
            f"load_classifier returned a value of type {type(loaded).__name__}; expected the model, an nn.Module. torch.load(path) "
            "gives back the state_dict, a dict of weights: load it into build_model() with load_state_dict."
        )
    X, _ = checkerboard(10, seed=5)
    with torch.no_grad():
        same = torch.equal(call(loaded, X), saved.eval()(X))
    assert same, (
        "load_classifier's model gives different scores from the one that was saved: load the file into it, "
        "model.load_state_dict(torch.load(path)), rather than returning a freshly built model."
    )
    assert not loaded.training, (
        "load_classifier returned a model in training mode; call model.eval() before returning it, "
        "since a loaded model is usually for predicting."
    )
