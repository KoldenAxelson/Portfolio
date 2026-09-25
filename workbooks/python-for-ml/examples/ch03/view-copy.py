import numpy as np

a = np.arange(6)
b = a[:3]
b[0] = 99
a
np.shares_memory(a, b)
c = a[:3].copy()
c[0] = -1
a
