import torch

t = torch.ones(2, 3)
t.device
# False here: this page runs PyTorch's CPU-only build.
torch.cuda.is_available()
device = 'cuda' if torch.cuda.is_available() else 'cpu'
# Already on that device, so .to() hands back t itself.
t.to(device) is t
t.to('cuda')  # raises
t.to(torch.float64).dtype
