# Chapter 1's moving example: a small CSV read by hand with pathlib, unpacking
# and comprehensions, then the same file through pandas (Chapter 4).

from stepper import Stepper

s = Stepper(caption='CSV Example')
s.line('from pathlib import Path')
s.step("path = Path('data') / 'runs.csv'", label='pathlib.Path', show=['path'],
       note='The / operator joins path parts. On Windows the same line makes a WindowsPath.')
s.step('text = path.read_text()', label='pathlib.Path', show=['text'],
       note='read_text opens the file, reads it all as one string and closes it again.')
s.step('header, *lines = text.splitlines()', label='unpacking', show=['header', 'lines'],
       note='The first line goes to header; the starred name collects the rest as a list.')
s.step("columns = header.split(',')", label='list', show=['columns'])
s.step("rows = [dict(zip(columns, line.split(','))) for line in lines]", label='comprehension', show=['rows'],
       note='One dict per line, pairing each column name with its value.')
s.step("rows[0]['loss'] + rows[1]['loss']", label='dict', show=['_'],
       note='Every value is still a string, so + joins the text instead of adding. No error, just a wrong answer.')
s.step("losses = {row['run']: float(row['loss']) for row in rows}", label='comprehension', show=['losses'],
       note='A dict comprehension, converting each loss to a float by hand.')
s.line('import pandas as pd')
s.step('df = pd.read_csv(path)', label='why pandas', show=['df'],
       note='pandas reads the same file in one call and works out a type for each column. Chapter 4 starts here.')
s.step("df['loss'][0] + df['loss'][1]", label='why pandas', show=['_'],
       note='The same sum as before, and this time a number: pandas read loss as float64.')
