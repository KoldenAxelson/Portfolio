#!/usr/bin/env python3
"""List everything in an article that makes a checkable claim, for a fact audit.

Prints numbered items in four groups, so an auditor can mark each one
Verified / Nuanced / Unverified / Wrong without missing any:

  PROSE       sentences with a number, year, name, link or superlative
  GLOSSARY    definitions and notes of every term the page links
  DEMO DATA   data files the page's demos render (timeline, references)
  LINKS       every outbound URL, for a resolve-and-read check

Usage:  python3 scripts/article-claims.py content/articles/<slug>.md
No third-party packages; the glossary is read with a light parser.
"""
import re
import sys
from pathlib import Path

TERM = re.compile(r'\{\{<\s*term\s+"([a-z0-9-]+)"\s*>\}\}(.*?)\{\{<\s*/term\s*>\}\}', re.S)
LINK = re.compile(r'\[([^\]]*)\]\(([^)\s]+)\)')
CHECKABLE = re.compile(
    r"\d"
    r"|(?i:\b(first|only|largest|biggest|smallest|fastest|cheapest|most|least|never|always|"
    r"invented|coined|announced|released|founded|won|standard|default)\b)"
    r"|(?<=[a-z,;:]\s)[A-Z][a-zA-Z]+")  # a capitalised word mid-sentence: a name
DATA_FILES = {'ml-timeline': 'data/ml/quantization-timeline.yaml'}


def prose_sentences(body):
    body = TERM.sub(r'\2', body)
    body = re.sub(r'\{\{[<%].*?[>%]\}\}', '', body, flags=re.S)
    lines = [l for l in body.splitlines() if l.strip() and not l.lstrip().startswith(('<', '#'))]
    text = ' '.join(lines)
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z*"“(])', text) if s.strip()]


def glossary_blocks(name, keys):
    blocks, current, key = {}, [], None
    for line in Path(f'data/glossary/{name}.yaml').read_text().splitlines():
        top = re.match(r'^([a-z0-9-]+):\s*$', line)
        if top:
            if key:
                blocks[key] = current
            key, current = top.group(1), []
        elif key and line.strip() and not line.lstrip().startswith('#'):
            current.append(line.strip())
    if key:
        blocks[key] = current
    return [(k, ' '.join(blocks[k])) for k in sorted(keys) if k in blocks]


def main(path):
    source = Path(path).read_text()
    front, body = source.split('---', 2)[1:]
    named = re.search(r'^glossary:\s*\[?\s*["\']?([a-z0-9-]+)', front, re.M)
    n = 0

    print('== PROSE ==')
    for sentence in prose_sentences(body):
        plain = LINK.sub(r'\1', sentence)
        if CHECKABLE.search(plain):
            n += 1
            print(f'{n}. {plain}')

    if named:
        print('\n== GLOSSARY (terms this page links) ==')
        for key, text in glossary_blocks(named.group(1), {k for k, _ in TERM.findall(body)}):
            n += 1
            print(f'{n}. [{key}] {text}')

    print('\n== DEMO DATA ==')
    slug = Path(path).stem
    files = [f for sc, f in DATA_FILES.items() if '{{< ' + sc in body]
    if '{{< ml-references' in body:
        files.append(f'data/ml/references/{slug}.yaml')
    for f in files:
        print(f'-- {f} (check every entry)')

    print('\n== LINKS ==')
    urls = sorted({u for _, u in LINK.findall(body)} | set(re.findall(r'url:\s*(\S+)', ''.join(
        Path(f).read_text() for f in files if Path(f).exists()))))
    for url in urls:
        print(url)
    print(f'\n{n} numbered claims, {len(urls)} links')


if __name__ == '__main__':
    main(sys.argv[1])
