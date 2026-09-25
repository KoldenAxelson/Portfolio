import numpy as np

a = np.arange(12).reshape(3, 4)
a[1].shape
a[1:2].shape
a[:, 1].shape
a[:, 1:2].shape
a[a > 5].shape
a[a[:, 0] > 2].shape
