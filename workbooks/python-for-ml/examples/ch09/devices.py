import torch
from torch import nn

device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = nn.Linear(2, 1)
# A module's .to() moves its weights in place and returns the module itself.
model.to(device) is model
# Every batch has to follow it; a mismatch raises. This page runs on the CPU,
# so a float64 batch stands in for one left on the wrong device.
model(torch.ones(3, 2, dtype=torch.float64))  # raises
model(torch.ones(3, 2, dtype=torch.float64).to(device, torch.float32)).shape
