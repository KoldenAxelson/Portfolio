import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(1)
target = rng.uniform(0, 10, 200)
prediction = target + rng.normal(0, 1, 200)
confusion = np.array([[50, 3, 2], [4, 40, 6], [1, 8, 30]])
fig, axs = plt.subplots(2, 2, figsize=(7, 5.4), layout='constrained')
axs.shape
axs[0, 0].scatter(target, prediction, s=6)
axs[0, 0].set_title('scatter: prediction vs target')
axs[0, 1].hist(prediction - target, bins=20)
axs[0, 1].set_title('hist: errors')
axs[1, 0].bar(['cat', 'dog', 'bird'], [120, 80, 30])
axs[1, 0].set_title('bar: examples per class')
axs[1, 1].imshow(confusion)
axs[1, 1].set_title('imshow: confusion matrix')
fig
