import matplotlib.pyplot as plt

fig, axs = plt.subplots(1, 2)
axs.shape
# plt.title titles the current Axes, the last one made.
plt.title('train')
[ax.get_title() for ax in axs]
# On an Axes, the same jobs are set_ methods.
axs[0].title('train')  # raises
axs[0].set_title('train')
[ax.get_title() for ax in axs]
plt.close(fig)
