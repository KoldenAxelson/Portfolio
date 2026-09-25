loss = 0.4213
f'loss {loss:.2f} after {3 * 2} epochs'
def log(*values, **fields):
    return values, fields
log(1, 2, lr=0.1)
def train(lr, epochs):
    return f'lr={lr}, epochs={epochs}'
config = {'lr': 0.1, 'epochs': 5}
train(**config)
