from dataclasses import dataclass

@dataclass
class Run:
    name: str
    lr: float

Run('a', 0.1)
Run('a', 0.1) == Run('a', 0.1)
# the hint says float, but nothing checks it
bad = Run('b', '0.05')
bad.lr * 2
