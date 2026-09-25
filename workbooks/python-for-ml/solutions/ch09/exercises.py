"""Chapter 9 workbook: Models and the Training Loop. Solutions."""
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

# ── Part 1: fix the bugs ─────────────────────────────────────────────────


def train_epoch(model: nn.Module, loader: DataLoader, loss_fn: nn.Module,
                optimizer: torch.optim.Optimizer) -> float:
    """Train `model` for one epoch and return the mean of the batch losses."""
    model.train()
    total = 0.0
    for xb, yb in loader:
        optimizer.zero_grad()  # the fix: backward adds to .grad, so clear it every batch
        logits = model(xb)
        loss = loss_fn(logits, yb)
        loss.backward()
        optimizer.step()
        total += loss.item()
    return total / len(loader)


def accuracy(model: nn.Module, loader: DataLoader) -> float:
    """The fraction of examples whose highest score is their class."""
    model.eval()  # the fix: dropout off while scoring
    correct = 0
    with torch.no_grad():
        for xb, yb in loader:
            correct += (model(xb).argmax(dim=1) == yb).sum().item()
    return correct / len(loader.dataset)


def predict(model: nn.Module, features: np.ndarray) -> torch.Tensor:
    """The class the model picks for each row of `features`."""
    model.eval()
    weight = next(model.parameters())
    with torch.no_grad():
        # The fix: match the model. On a GPU, the device is what would differ.
        batch = torch.from_numpy(features).to(device=weight.device, dtype=weight.dtype)
        return model(batch).argmax(dim=1)


# ── Part 2: build it ─────────────────────────────────────────────────────

EPOCHS = 40
BATCH_SIZE = 32


def build_model() -> nn.Module:
    """A new classifier: 2 features in, 2 raw scores out."""
    return nn.Sequential(nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 2))


def train_classifier(X: torch.Tensor, y: torch.Tensor) -> nn.Module:
    """Build a model and train it on X and y."""
    model = build_model()
    loader = DataLoader(TensorDataset(X, y), batch_size=BATCH_SIZE, shuffle=True)
    loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.02)
    for _ in range(EPOCHS):
        train_epoch(model, loader, loss_fn, optimizer)
    return model


def load_classifier(path: Path) -> nn.Module:
    """A fresh model with the state_dict saved at `path`, in evaluation mode."""
    model = build_model()
    model.load_state_dict(torch.load(path))
    return model.eval()
