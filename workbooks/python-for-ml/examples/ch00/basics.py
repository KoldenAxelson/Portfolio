# The component demo page's example: a transcript with output, a hidden
# line, and an error the page shows on purpose.
import numpy as np
np.set_printoptions(linewidth=60)  # hide

a = np.arange(12).reshape(3, 4)
a
a.shape
print("sum:", a.sum())
a + np.ones(3)  # raises
