import numpy as np

A = np.ones((2, 3))
B = np.ones((3, 4))
(A @ B).shape
np.dot(np.array([1, 2, 3]), np.array([4, 5, 6]))
a = np.zeros((2, 3))
b = np.ones((2, 3))
np.concatenate([a, b]).shape, np.stack([a, b]).shape
x = np.array([-2, -1, 0, 1, 2])
np.where(x > 0, x, 0)
np.clip(x, -1, 1)
