# Chapter 8's moving example: y = w·x + b, then the gradients flowing back
# to w and b, a second backward adding onto the first, and detach.

from stepper import Stepper

s = Stepper(caption='Autograd Example')
s.line('import torch')
s.step('x = torch.tensor([1., 2., 3.])', label='torch.tensor', show=['x'],
       note='Made from a list of floats: shape (3,), dtype torch.float32.')
s.step('w = torch.tensor([0.5, -1., 2.], requires_grad=True)', label='requires_grad', show=['w'],
       note='requires_grad=True: autograd records everything computed from w.')
s.step('b = torch.tensor(1., requires_grad=True)', label='requires_grad', show=['b'],
       note='A single number is a tensor too, with shape ().')
s.step('y = w @ x + b', label='autograd', show=['y'],
       note='0.5·1 − 1·2 + 2·3 + 1 = 5.5. grad_fn names the operation that made y, the +.')
s.step('w.grad', label='.grad', show=['_'],
       note='No gradient yet: .grad is None until backward runs.')
s.step('y.backward()', label='backward', show=['x', 'w.grad', 'b.grad'],
       note='The gradient of y with respect to w is x, and with respect to b it is 1.')
s.step('(w @ x + b).backward()', label='.grad', show=['w.grad', 'b.grad'],
       note='A second backward adds to .grad: 2, 4, 6 now, not 1, 2, 3.')
s.step('w.detach().numpy()', label='detach', show=['_'],
       note='detach gives the same values with no graph, and then .numpy() works.')
