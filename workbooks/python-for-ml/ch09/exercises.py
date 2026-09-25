"""Chapter 9 workbook: Models and the Training Loop.

Two parts. Fix the three functions marked FIX, replace every
`raise NotImplementedError`, then run `pytest`. Everything runs on the CPU.
"""
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

# ── Part 1: fix the bugs ─────────────────────────────────────────────────
# Three pieces of one training script, each with one bug. The first two run
# without an error and give wrong numbers; the third raises.


def train_epoch(model: nn.Module, loader: DataLoader, loss_fn: nn.Module,
                optimizer: torch.optim.Optimizer) -> float:
    """FIX: train `model` for one epoch and return the mean of the batch
    losses, as a float.

    For each batch it should clear the gradients, run the model, compute the
    loss, call backward and step the optimizer. From the second batch on, its
    steps come out wrong: find out why.
    """
    model.train()
    total = 0.0
    for xb, yb in loader:
        logits = model(xb)
        loss = loss_fn(logits, yb)
        loss.backward()
        optimizer.step()
        total += loss.item()
    return total / len(loader)


def accuracy(model: nn.Module, loader: DataLoader) -> float:
    """FIX: the fraction of examples whose highest score is their class, a
    float from 0 to 1.

    On a model with dropout, its answer is noisy: it can
    change from call to call, and it isn't the one the model earns. Find out why.
    """
    correct = 0
    with torch.no_grad():
        for xb, yb in loader:
            correct += (model(xb).argmax(dim=1) == yb).sum().item()
    return correct / len(loader.dataset)


def predict(model: nn.Module, features: np.ndarray) -> torch.Tensor:
    """FIX: the class the model picks for each row of `features`, a NumPy
    array of shape (n, 2), as an int64 tensor of shape (n,).

    It raises on the float64 arrays NumPy makes by default. On a GPU the same
    kind of bug is a model on 'cuda' and a batch left on the CPU; this packet
    runs on the CPU, so a dtype mismatch plays that part. Fix it the way you
    would fix a device: move the input to match the model, with .to().
    """
    model.eval()
    with torch.no_grad():
        batch = torch.from_numpy(features)
        return model(batch).argmax(dim=1)


# ── Part 2: build it ─────────────────────────────────────────────────────
# Points (x1, x2) in the square from -1 to 1, labelled 1 where x1 and x2
# have the same sign and 0 where they don't: a checkerboard of four
# quarters. No straight line separates the classes, so the model needs a
# hidden layer with a ReLU after it.


def build_model() -> nn.Module:
    """A new, untrained classifier: 2 features in, 2 raw scores (one per
    class) out, with at least one hidden nn.Linear layer and an nn.ReLU."""
    raise NotImplementedError("build_model: an nn.Sequential of nn.Linear, nn.ReLU and nn.Linear")


def train_classifier(X: torch.Tensor, y: torch.Tensor) -> nn.Module:
    """Build a model with build_model(), train it on X (float32, shape
    (n, 2)) and y (int64 classes 0 and 1, shape (n,)), and return it.

    Use the training loop from the chapter: a DataLoader over
    TensorDataset(X, y) with shuffle=True, nn.CrossEntropyLoss and an
    optimizer such as torch.optim.AdamW. The tests want at least 90% accuracy
    on 400 points the model never saw, in under 30 seconds on a laptop CPU.
    """
    raise NotImplementedError("train_classifier: build_model(), a DataLoader, a loss and an optimizer, then the five-line loop for some epochs")


def load_classifier(path: Path) -> nn.Module:
    """Read the state_dict saved at `path` with torch.save, load it into a
    fresh build_model(), and return that model in evaluation mode."""
    raise NotImplementedError("load_classifier: model.load_state_dict(torch.load(path)), then model.eval()")

