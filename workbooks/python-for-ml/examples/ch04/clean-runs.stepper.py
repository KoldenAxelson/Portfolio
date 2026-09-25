# Chapter 4's moving example: a messy CSV of eight training runs, loaded,
# inspected, selected from and cleaned one line at a time.

from stepper import Stepper

RAW = "pd.read_csv('data/runs.csv', index_col='run')"

s = Stepper(caption='Table Example')
s.line('import pandas as pd')
s.step("df = pd.read_csv('data/runs.csv', index_col='run')", label='read_csv', show=['df'],
       note='Eight runs. The run column became the index, and every blank field came in as NaN.')
s.step('df.dtypes', label='dtype', show=['_'],
       note="One dtype per column. Text is pandas 3's str; epochs is float64 because NaN is a float.")
s.step('df.isna()', label='isna', show=['_'], mask={'_': '_'},
       note='True where a value is missing: two epochs, one val_loss, one device.')
s.step("df['val_loss']", label='column selection', show=['df', '_'], pick={'df': "df['val_loss']"},
       note='One column name in brackets gives a Series, and it keeps the index.')
s.step("df.loc['r3':'r5', ['model', 'epochs']]", label='loc', show=['df', '_'],
       pick={'df': "df.loc['r3':'r5', ['model', 'epochs']]"},
       note="loc takes labels, and a label slice includes its end: 'r3':'r5' is three rows.")
s.step('df.iloc[[0, -1], :2]', label='iloc', show=['df', '_'], pick={'df': 'df.iloc[[0, -1], :2]'},
       note='iloc takes positions, like NumPy: the first and last rows, the first two columns.')
s.step("df[df['val_loss'] < 0.4]", label='boolean mask', show=['df', '_'], mask={'df': "df['val_loss'] < 0.4"},
       note="Three rows pass. r4's val_loss is NaN, and NaN < 0.4 is False, so r4 fails this test; NaN >= 0.4 is False too.")
s.step("df = df.dropna(subset=['val_loss'])", label='dropna', show=['df'],
       note='A run with no loss is no use here, so it goes: seven rows, and the other labels stay as they were.')
s.step("df = df.fillna({'epochs': 10, 'device': 'cpu'})", label='fillna', show=['df'],
       mask={'df': f'{RAW}.loc[df.index].isna()'},
       note='A dict fills each column with its own value: 10 epochs where none was logged, and cpu where the device is blank.')
s.step("df = df.astype({'epochs': 'int64'})", label='astype', show=['df'], pick={'df': "df['epochs']"},
       note='With no NaN left, epochs can be whole numbers again: 10, not 10.0.')
s.step("df = df.assign(steps=df['epochs'] * 250)", label='assign', show=['df'], pick={'df': "df['steps']"},
       note='A new column, worked out from another: 250 batches in every epoch.')
s.step("df['model'].value_counts()", label='value_counts', show=['_'],
       note='How often each value appears, most common first.')
s.step("X = df[['lr', 'epochs']].to_numpy()", label='to_numpy', show=['X'],
       note='Two columns handed to NumPy as one (7, 2) array, ready for a model.')
