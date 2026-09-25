from stepper import Stepper

s = Stepper(caption='Array Example')
s.line('import numpy as np')
s.step('a = np.arange(12).reshape(3, 4)', label='ndarray', show=['a'])
s.step('a[1:, ::2]', label='slicing', show=['a', '_'], pick={'a': 'a[1:, ::2]'})
s.step('a[a % 2 == 0]', label='boolean mask', show=['a', '_'], mask={'a': 'a % 2 == 0'})
s.step('a.reshape(2, 2, 3)', label='reshape', show=['_'], note='Same twelve values, now read as two 2×3 layers.')
