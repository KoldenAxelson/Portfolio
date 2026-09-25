import tempfile
from pathlib import Path

import torch
from torch import nn

_ = torch.manual_seed(0)  # hide
path = Path(tempfile.mkdtemp()) / 'model.pt'  # hide
model = nn.Sequential(nn.Linear(2, 4), nn.ReLU(), nn.Linear(4, 2))
# The state_dict: every weight by name. Numbers 0 and 2 are the two Linear layers.
{name: tuple(t.shape) for name, t in model.state_dict().items()}
# path is a model.pt file in a scratch folder.
torch.save(model.state_dict(), path)
# Load into a fresh model of the same shape.
fresh = nn.Sequential(nn.Linear(2, 4), nn.ReLU(), nn.Linear(4, 2))
fresh.load_state_dict(torch.load(path))
x = torch.randn(3, 2)
torch.equal(fresh(x), model(x))
