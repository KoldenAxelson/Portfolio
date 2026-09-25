import os, tempfile  # hide
os.chdir(tempfile.mkdtemp())  # hide
import numpy as np

X = np.arange(6, dtype=np.float32).reshape(2, 3)
np.save("batch.npy", X)
Y = np.load("batch.npy")
Y.dtype, Y.shape, np.array_equal(X, Y)
