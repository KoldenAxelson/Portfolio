import numpy as np

X = np.array([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]])
X.sum(), X.sum(axis=0), X.sum(axis=1)
X.argmax(axis=1)
X.mean(axis=1).shape, X.mean(axis=1, keepdims=True).shape
X - X.mean(axis=1, keepdims=True)
X - X.mean(axis=1)  # raises
