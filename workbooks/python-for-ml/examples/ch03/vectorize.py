import numpy as np

cents = np.array([1999, 549, 375])
qty = np.array([2, 10, 4])
total = 0
for price, count in zip(cents, qty):
    total += price * count
total
(cents * qty).sum()
np.sqrt(np.array([1.0, 4.0, 9.0]))
