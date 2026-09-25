#!/usr/bin/env python3
"""Count the words a reader actually sees in a text-lite page.

Counts prose, headings and list items. Skips front matter, shortcodes that
render demos or references, raw HTML blocks, and the text inside a vocabulary
term is counted as the word itself (it is visible). Usage:

    python3 scripts/article-words.py content/articles/some-post.md [--max 1500]
    python3 scripts/article-words.py --sections content/articles/some-post.md

With --max, exits 1 when any file is over budget. --sections lists the words in
each stretch between headings or demos, flagging any over 150.
"""
import re
import sys
from pathlib import Path

TERM = re.compile(r'\{\{<\s*term\s+"[^"]+"\s*>\}\}(.*?)\{\{<\s*/term\s*>\}\}', re.S)
SHORTCODE = re.compile(r'\{\{[<%].*?[>%]\}\}', re.S)
LINK = re.compile(r'\[([^\]]*)\]\([^)]*\)')


def visible_words(source):
    body = source.split('---', 2)[2]
    body = TERM.sub(r'\1', body)
    body = SHORTCODE.sub('', body)
    body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
    kept = [line for line in body.splitlines() if not line.lstrip().startswith('<')]
    text = LINK.sub(r'\1', '\n'.join(kept))
    text = re.sub(r'[#*_`>|-]+', ' ', text)
    return len(re.findall(r"[\w'’.,%×–-]*\w", text))


SECTION_LIMIT = 150


def print_sections(path):
    """Words per stretch of prose, split at every heading and every demo."""
    body = Path(path).read_text().split('---', 2)[2]
    body = TERM.sub(r'\1', body)
    parts = re.split(r'^(#{1,6} .*|\{\{<\s*(?!term\b)[a-z-]+[^>]*>\}\})\s*$', body, flags=re.M)
    label = '(opening)'
    for i, part in enumerate(parts):
        if i % 2 == 1:
            label = part.strip()
            continue
        count = visible_words('---\n---\n' + part)
        if count:
            flag = '  OVER' if count > SECTION_LIMIT else ''
            print(f'{count:5d}  after {label}{flag}')


def main(args):
    budget = None
    if '--max' in args:
        i = args.index('--max')
        budget = int(args[i + 1])
        args = args[:i] + args[i + 2:]
    if '--sections' in args:
        for path in [a for a in args if a != '--sections']:
            print_sections(path)
        return 0
    over = False
    for path in args:
        count = visible_words(Path(path).read_text())
        flag = ''
        if budget and count > budget:
            flag, over = f'  OVER by {count - budget}', True
        print(f'{count:6d}  {path}{flag}')
    return 1 if over else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
