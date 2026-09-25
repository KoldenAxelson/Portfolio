from pathlib import Path

path = Path('data/runs.csv')
with path.open() as f:
    header = f.readline()
header, f.closed
def losses(path):
    with path.open() as f:
        next(f)  # skip the header
        for line in f:
            yield float(line.split(',')[2])

g = losses(path)
next(g)
list(g)
list(g)
