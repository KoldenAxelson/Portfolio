import time
import numpy as np
import pandas as pd

ms = pd.Series(np.random.default_rng(0).integers(50, 2000, size=200_000))
ms.apply(lambda v: v / 1000).equals(ms / 1000)


def best_seconds(work, repeats=3):
    timings = []
    for _ in range(repeats):
        start = time.perf_counter()
        work()
        timings.append(time.perf_counter() - start)
    return min(timings)


looped = best_seconds(lambda: ms.apply(lambda v: v / 1000))
vectorized = best_seconds(lambda: ms / 1000)
looped > 10 * vectorized
