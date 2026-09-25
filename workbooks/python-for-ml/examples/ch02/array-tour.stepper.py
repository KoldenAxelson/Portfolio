# Chapter 2's moving example: one 3×4 array through slice, mask, fancy index,
# reshape and transpose.

from stepper import Stepper

s = Stepper(caption='Array Example')
s.line('import numpy as np')
s.step('a = np.arange(12).reshape(3, 4)', label='ndarray', show=['a'],
       note='Twelve values, three rows of four: shape (3, 4), dtype int64.')
s.step('a[1:, ::2]', label='slicing', show=['a', '_'], pick={'a': 'a[1:, ::2]'},
       note='Rows 1 onward, every second column. A slice keeps both axes.')
s.step('a[a % 2 == 0]', label='boolean mask', show=['a', '_'], mask={'a': 'a % 2 == 0'},
       note='The even values, in reading order. A mask the same shape as the array gives back 1-D.')
s.step('a[[2, 0]]', label='fancy indexing', show=['a', '_'], pick={'a': 'a[[2, 0]]'},
       note='Row 2, then row 0: a list of positions picks rows in the order you give.')
s.step('a.reshape(2, -1)', label='reshape', show=['_'],
       note='The same twelve values read into two rows; -1 works out the 6.')
s.step('a.T', label='transpose', show=['_'],
       note='Rows become columns: shape (4, 3).')
