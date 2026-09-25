# Chapter 6's moving example: a training log turned into a loss plot one line
# at a time. The stepper draws values, not pictures, so each step shows what
# the line changed; the rendered plot is the loss-curve example below it.

from stepper import Stepper

s = Stepper(caption='Loss Curve Example')
s.line('import matplotlib.pyplot as plt')
s.line('import pandas as pd')
s.step("log = pd.read_csv('data/training-log.csv', index_col='epoch')", label='read_csv', show=['log'],
       note='Twelve epochs of a made-up run: the loss on the training data and on held-out validation data.')
s.step('fig, ax = plt.subplots()', label='plt.subplots', show=['fig', 'ax'],
       note='One Figure, the whole image, holding one Axes, the plot area. Nothing is drawn yet.')
s.step("ax.plot(log.index, log['train_loss'], label='train')", label='plot', show=['ax.lines[0].get_ydata()'],
       note='A line through twelve points: epoch across, train loss up. The label is for the legend.')
s.step("ax.plot(log.index, log['val_loss'], label='validation')", label='plot',
       show=['[line.get_label() for line in ax.lines]'],
       note='A second call adds a second line to the same Axes, in the next colour.')
s.step("ax.set_xlabel('epoch')", label='labels', show=['ax'])
s.step("ax.set_ylabel('loss')", label='labels', show=['ax'])
s.step("ax.set_title('Train vs validation loss')", label='title', show=['ax'],
       note="The Axes' repr now lists its title and both labels.")
s.step('ax.legend()', label='legend', show=['[text.get_text() for text in ax.get_legend().get_texts()]'],
       note='legend() collects the label of every labelled line on this Axes.')
s.step("best = log['val_loss'].idxmin()", label='overfitting', show=['best', 'log'], pick={'log': 'log.loc[best:]'},
       note='Validation loss is lowest at epoch 7. After it, train loss keeps falling while validation climbs: overfitting.')
