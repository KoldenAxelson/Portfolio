#!/usr/bin/env python3
"""Flag {{< term >}} links whose visible text isn't the vocabulary word.

The linked text should be the term itself (any case, singular or plural, or a
short form in its label like "RAG", or one of the entry's `aliases`),
not a paraphrase. Usage:

    python3 scripts/check-terms.py content/articles/some-post.md [...]
    python3 scripts/check-terms.py --unlinked content/articles/some-post.md

--unlinked lists glossary words that appear in the prose without a term link
(every occurrence should be linked, including terms from earlier chapters). It
is advisory and always exits 0: ordinary English words ("where", "loss") can
match a key, so read each hit and ignore those.

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


def prose_only(source):
    """The visible prose, with term links, code, links, shortcodes and HTML removed."""
    body = source.split('---', 2)[2]
    body = re.sub(r'```.*?```', ' ', body, flags=re.S)
    body = TERM.sub(' ', body)
    body = re.sub(r'\{\{[<%].*?[>%]\}\}', ' ', body, flags=re.S)
    body = re.sub(r'<!--.*?-->', ' ', body, flags=re.S)
    body = re.sub(r'`[^`]*`', ' ', body)
    body = re.sub(r'\[[^\]]*\]\([^)]*\)', ' ', body)
    lines = [l for l in body.splitlines() if not l.lstrip().startswith(('<', '#'))]
    return '\n'.join(lines)


def unlinked(path):
    source = Path(path).read_text()
    glossary = load_glossary(glossary_name(path, source.split('---')[1]))
    prose = prose_only(source)
    for key, entry in sorted(glossary.items()):
        names = sorted(forms(key, entry['term'], entry.get('aliases', [])), key=len, reverse=True)
        for name in (n for n in names if len(n) >= 3):
            hit = re.search(r'(?<![\w-])' + re.escape(name).replace(r'\ ', r'[\s-]') + r'(e?s)?(?![\w-])', prose, re.I)
            if hit:
                snippet = prose[max(0, hit.start() - 30):hit.end() + 30].replace('\n', ' ')
                print(f'{path}: "{hit.group(0)}" could link {key}  …{snippet}…')
                break


if __name__ == '__main__':
    args = sys.argv[1:]
    if '--unlinked' in args:
        for p in (a for a in args if a != '--unlinked'):
            unlinked(p)
        sys.exit(0)
    total = sum(check(p) for p in args)
    sys.exit(1 if total else 0)
