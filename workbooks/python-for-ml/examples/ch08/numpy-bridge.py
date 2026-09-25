import numpy as np
import torch

a = np.zeros(3)
shared = torch.from_numpy(a)
copied = torch.tensor(a)
a[0] = 7
# from_numpy shares a's memory; torch.tensor made a copy.
shared, copied
shared.numpy()
w = torch.ones(3, requires_grad=True)
w.numpy()  # raises
w.detach().numpy()
