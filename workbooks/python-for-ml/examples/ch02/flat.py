import numpy as np

a = np.arange(6).reshape(2, 3)
a.ravel()
np.shares_memory(a, a.ravel()), np.shares_memory(a, a.flatten())
a.T
