import matplotlib.pyplot as plt
import numpy as np

# A made-up loss over 500 steps: a power law with a little noise.
rng = np.random.default_rng(0)
step = np.arange(1, 501)
loss = 2.5 * step ** -0.7 * np.exp(rng.normal(0, 0.05, 500))
loss[[0, 99, 499]].round(3)
fig, (left, right) = plt.subplots(1, 2, figsize=(8, 3), layout='constrained')
left.plot(step, loss)
left.set_title('linear')
right.plot(step, loss)
right.set_yscale('log')
right.set_title('log')
left.set_xlabel('step')
right.set_xlabel('step')
left.set_ylabel('loss')
fig
