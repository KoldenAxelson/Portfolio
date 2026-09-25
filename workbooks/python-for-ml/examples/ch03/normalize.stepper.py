# Chapter 3's moving example: normalizing a batch, column by column, with no
# loop. Broadcasting does the stretching.

from stepper import Stepper

s = Stepper(caption='Batch Example')
s.line('import numpy as np')
s.step('X = np.array([[1, 2, 30], [3, 4, 10], [5, 6, 20], [7, 8, 40]])',
       label='ndarray', show=['X'], note='A batch: 4 examples (rows) of 3 features (columns).')
s.step('mu = X.mean(axis=0)', label='mean', show=['X', 'mu'],
       note='axis=0 collapses the rows: one mean per column, shape (3,).')
s.step('X - mu', label='broadcasting', show=['X', 'mu', '_'], pick={'X': 'X[:, 2]', 'mu': 'mu[2]', '_': '_[:, 2]'},
       note='(4, 3) minus (3,): mu is stretched down all four rows, so 25 comes off every value in column 2.')
s.step('sd = X.std(axis=0)', label='reduction', show=['sd'],
       note='Another reduction along axis 0: one spread per column.')
s.step('Z = (X - mu) / sd', label='vectorization', show=['Z'],
       note='The whole batch in one line: every column now centred on 0 with spread 1.')
s.step('Z.mean(axis=0).round(6), Z.std(axis=0)', label='mean', show=['_'],
       note='Checked: each column has mean 0 and standard deviation 1.')
