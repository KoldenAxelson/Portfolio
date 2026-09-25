import torch
from torch import nn

_ = torch.manual_seed(0)  # hide


# A model is a class: layers made in __init__, used in forward.
class Classifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.hidden = nn.Linear(2, 4)
        self.out = nn.Linear(4, 2)

    def forward(self, x):
        return self.out(torch.relu(self.hidden(x)))


model = Classifier()
# Call the model, not forward: model(x) runs forward for you.
model(torch.randn(5, 2)).shape
# The same model as a chain of layers.
nn.Sequential(nn.Linear(2, 4), nn.ReLU(), nn.Linear(4, 2))
# Every weight and bias the optimizer will step: 2*4 + 4 + 4*2 + 2.
sum(p.numel() for p in model.parameters())
# An embedding looks rows up by id: 10 ids, 3 numbers each.
nn.Embedding(10, 3)(torch.tensor([7, 2, 7])).shape
