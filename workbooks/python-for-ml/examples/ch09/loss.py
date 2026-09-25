import torch
from torch import nn

# Raw scores (logits) for 3 examples and 2 classes, and each one's class.
logits = torch.tensor([[2.0, -1.0], [0.5, 0.5], [-1.0, 3.0]])
target = torch.tensor([0, 1, 1])
nn.CrossEntropyLoss()(logits, target)
# Classes must be integers; float labels raise.
nn.CrossEntropyLoss()(logits, target.float())  # raises
# Softmaxing first doesn't raise; it just gives a different, wrong loss.
nn.CrossEntropyLoss()(logits.softmax(dim=1), target)
# For numbers rather than classes: the mean squared error.
nn.MSELoss()(torch.tensor([2.5, 0.0]), torch.tensor([3.0, 0.0]))
