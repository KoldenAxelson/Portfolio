import numpy as np

a = np.array([[1, 2, 3], [4, 5, 6]])
a.shape, a.dtype
np.zeros((2, 3))
np.full((2, 3), 7)
np.arange(0, 12, 3)
np.linspace(0, 1, 5)
rng = np.random.default_rng(0)
rng.integers(0, 10, size=4)
