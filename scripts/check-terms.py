#!/usr/bin/env python3
"""Flag {{< term >}} links whose visible text isn't the vocabulary word.

The linked text should be the term itself (any case, singular or plural, or a
short form in its label like "RAG", or one of the entry's `aliases`),
not a paraphrase. Usage:

    python3 scripts/check-terms.py content/articles/some-post.md [...]

Reads the page's `glossary:` front matter, or the one its section's _index.md
cascades (default basic-logic). Exit code 1 if
anything is flagged, so it can gate a commit.
"""
import re
import sys
from pathlib import Path

TERM = re.compile(r'\{\{<\s*term\s+"([a-z0-9-]+)"\s*>\}\}(.*?)\{\{<\s*/term\s*>\}\}', re.S)


def forms(key, label, aliases=()):
    """Every acceptable spelling of a term, lowercased."""
    names = {key.replace('-', ' '), label.lower()} | {a.lower() for a in aliases}
    names |= {p.strip().lower() for p in re.findall(r'\(([^)]+)\)', label)}
    names.add(re.sub(r'\s*\([^)]*\)', '', label).strip().lower())
    return names


def matches(text, names):
    text = text.lower().replace('-', ' ')
    stems = {text, text.rstrip('s'), re.sub(r'(e?s|ed|d)$', '', text)}
    return any(s == n.replace('-', ' ') or s == n.replace('-', ' ').rstrip('s') for s in stems for n in names)


def load_glossary(name):
    """Just the fields this check needs: key -> (term, aliases).

    Parsed by hand so the script runs on a stock Python with no PyYAML. Relies
    on the glossary layout: top-level `key:`, then `  term:` and `  aliases: [...]`.
    """
    glossary, key = {}, None
    for line in Path(f'data/glossary/{name}.yaml').read_text().splitlines():
        if top := re.match(r'^([a-z0-9-]+):\s*$', line):
            key = top.group(1)
            glossary[key] = {'term': key, 'aliases': []}
        elif key and (term := re.match(r'^  term:\s*(.+)$', line)):
            glossary[key]['term'] = term.group(1).strip().strip('\'"')
        elif key and (al := re.match(r'^  aliases:\s*\[(.*)\]\s*$', line)):
            glossary[key]['aliases'] = [a.strip().strip('\'"') for a in al.group(1).split(',') if a.strip()]
    return glossary


GLOSSARY_KEY = re.compile(r'^\s*glossary:\s*\[?\s*["\']?([a-z0-9-]+)', re.M)


def glossary_name(path, front):
    """The page's own `glossary:`, else the one its section's _index.md cascades."""
    named = GLOSSARY_KEY.search(front)
    section = Path(path).parent / '_index.md'
    if not named and section.exists() and Path(path).name != '_index.md':
        named = GLOSSARY_KEY.search(section.read_text().split('---')[1])
    return named.group(1) if named else 'basic-logic'


def check(path):
    source = Path(path).read_text()
    glossary = load_glossary(glossary_name(path, source.split('---')[1]))
    flagged = 0
    for key, text in TERM.findall(source):
        entry = glossary.get(key)
        if not entry:
            print(f'{path}: unknown key "{key}"')
            flagged += 1
        elif not matches(text.strip(), forms(key, entry['term'], entry.get('aliases', []))):
            print(f'{path}: "{text.strip()}" links to "{entry["term"]}"')
            flagged += 1
    return flagged


if __name__ == '__main__':
    total = sum(check(p) for p in sys.argv[1:])
    sys.exit(1 if total else 0)
