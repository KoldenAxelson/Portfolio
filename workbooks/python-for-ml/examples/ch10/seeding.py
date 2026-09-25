import torch
from torch import nn


def first_layer(seed):
    torch.manual_seed(seed)
    return nn.Linear(3, 2).weight


# The same seed draws the same starting weights; another seed doesn't.
torch.equal(first_layer(0), first_layer(0))
torch.equal(first_layer(0), first_layer(1))
