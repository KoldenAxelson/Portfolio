# Chapter 9's moving example: one epoch of a tiny classifier. 16 points, two
# batches of 8, so the loop body is stepped twice. The loop header is stepped
# by taking the loader's next batch, which is what the for statement does.

from stepper import Stepper

s = Stepper(caption='Training Loop Example')
s.line('import torch')
s.line('from torch import nn')
s.line('from torch.utils.data import DataLoader, TensorDataset')
s.line('torch.manual_seed(0)')
s.line('X = torch.randn(16, 2)')
s.line('y = (X.sum(dim=1) > 0).long()')
s.step('loader = DataLoader(TensorDataset(X, y), batch_size=8, shuffle=True)', label='DataLoader',
       show=['len(loader)'], note='16 rows in batches of 8: two batches make one epoch.')
s.step('model = nn.Sequential(nn.Linear(2, 4), nn.ReLU(), nn.Linear(4, 2))', label='nn.Sequential',
       show=['model'], note='2 features in, 2 raw scores out: one per class.')
s.line('loss_fn = nn.CrossEntropyLoss()')
s.line('optimizer = torch.optim.SGD(model.parameters(), lr=0.5)')
s.line('model.train()')

BODY = [
    ('    optimizer.zero_grad()', 'zero_grad', ['model[2].weight.grad']),
    ('    logits = model(xb)', 'forward', ['logits']),
    ('    loss = loss_fn(logits, yb)', 'loss', ['loss']),
    ('    loss.backward()', 'backward', ['model[2].weight', 'model[2].weight.grad']),
    ('    optimizer.step()', 'step', ['model[2].weight', 'loss_fn(model(xb), yb)']),
]
NOTES = {
    (1, 'zero_grad'): 'Nothing to clear yet: .grad is None until the first backward.',
    (2, 'zero_grad'): 'Batch 1’s gradients are gone: zero_grad sets every .grad to None.',
    (1, 'forward'): 'Calling model(xb) runs forward: one row of two scores per example.',
    (1, 'loss'): 'CrossEntropyLoss takes the raw scores and the class indices yb.',
    (1, 'backward'): 'backward fills .grad for every weight in the model; here, the last layer’s.',
    (2, 'loss'): 'A new batch, a new loss. Batch losses jump about; the fall shows over epochs.',
    (1, 'step'): 'Each weight moved by lr × its gradient, the other way (a zero gradient leaves it put); the same batch now scores a lower loss.',
    (2, 'step'): 'Two batches, one epoch. The next epoch starts the loop over, reshuffled.',
}

s.line('for xb, yb in loader:', run='batches = iter(loader)')
for batch in (1, 2):
    s.step('for xb, yb in loader:', label='batch', show=['xb', 'yb'], run='xb, yb = next(batches)',
           note=f'Batch {batch} of 2: 8 shuffled rows and their classes.')
    for code, label, show in BODY:
        s.step(code, label=label, show=show, note=NOTES.get((batch, label)))
