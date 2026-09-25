import torch

t = torch.tensor([[1, 2, 3], [4, 5, 6]])
t.shape, t.dtype, t.device
torch.zeros(2, 3)
# Seeded, so a rerun draws the same numbers.
_ = torch.manual_seed(0)
torch.randn(2, 3)
# Python floats become float32; NumPy would make float64.
torch.tensor([0.5, 1.5]).dtype
t.float().mean()
