import numpy as np

a = np.arange(12).reshape(3, 4)
row = np.array([10, 20, 30, 40])
a + row
col = np.array([[100], [200], [300]])
(a + col).shape
a + np.array([1, 2, 3])  # raises
