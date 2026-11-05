#!/usr/bin/env python3
"""Build the public-domain passages for /misc/typing-speed/.

    python3 scripts/typing-speed/build-books.py

Downloads each book below from Project Gutenberg (plain text), keeps the
opening sections, and writes data/typing-speed/books/<slug>.yaml: the book's
title, author, translator, source URL and its sections, each a title and a
list of paragraphs. The typing test's script (assets/scripts/pages/
typing-speed/) makes the text typeable (curly quotes, dashes, accents), so the
files keep Gutenberg's own punctuation. Gutenberg asks for a pause between
downloads; the script waits two seconds.
"""
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "typing-speed" / "books"
URL = "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt"
ROMAN = r"[IVXLC]+"


def fetch(book_id):
    request = urllib.request.Request(URL.format(id=book_id), headers={"User-Agent": "wrightfunctions-typing-speed/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        text = response.read().decode("utf-8-sig")
    body = re.split(r"\*\*\* START OF.*?\*\*\*", text, maxsplit=1)[1]
    return re.split(r"\*\*\* END OF", body, maxsplit=1)[0].replace("\r\n", "\n")


def paragraphs(block):
    """Blank-line separated paragraphs, each joined onto one line."""
    out = []
    for raw in re.split(r"\n\s*\n", block):
        lines = [line.strip() for line in raw.strip().split("\n") if line.strip()]
        if lines:
            out.append(" ".join(lines))
    return out


def between(text, start, end=None):
    """The text from the first match of `start` up to the next match of `end`."""
    match = re.search(start, text, re.M)
    if not match:
        sys.exit(f"marker not found: {start}")
    rest = text[match.end():]
    if end:
        stop = re.search(end, rest, re.M)
        rest = rest[:stop.start()] if stop else rest
    return rest


def meditations(text):
    sections = []
    for name, nxt in [("FIRST", "SECOND"), ("SECOND", "THIRD"), ("THIRD", "FOURTH")]:
        block = between(text, rf"^THE {name} BOOK\s*$", rf"^THE {nxt} BOOK\s*$")
        paras = [re.sub(rf"^{ROMAN}\.\s+", "", p) for p in paragraphs(block)]
        sections.append({"title": f"Book {['One', 'Two', 'Three'][len(sections)]}", "paragraphs": paras})
    return sections


def aesop(text, count=40):
    # Each fable is its title, two blank lines, then the story, whose first
    # word is in capitals ("WOLF, meeting with a Lamb..."). The contents list
    # before them has titles but no stories, so it never matches.
    sections = []
    for piece in re.split(r"\n{4,}", text):
        match = re.match(r"^([^\n]{3,60})\n\n+([A-Z]{2,}[\s\S]*)$", piece.strip())
        if not match:
            continue
        sections.append({"title": match.group(1).strip(), "paragraphs": paragraphs(match.group(2))})
        if len(sections) == count:
            break
    return sections


def odyssey(text, books=3):
    sections = []
    names = ["I", "II", "III", "IV"]
    for k in range(books):
        block = between(text, rf"^BOOK {names[k]}\s*$", rf"^BOOK {names[k + 1]}\s*$")
        paras = paragraphs(block)[1:]  # the first is the book's capitalised summary
        paras = [re.sub(r"\s*\[\d+\]", "", p) for p in paras if not re.match(r"^\[\d+\]", p)]
        sections.append({"title": f"Book {names[k]}", "paragraphs": paras})
    return sections


def republic(text):
    block = between(text, r"^I went down yesterday", r"^\s*BOOK II\.")
    first = "I went down yesterday"
    paras = paragraphs(first + block)
    paras = [p for p in paras if not re.match(r"^(BOOK|PERSONS|SCENE|Socrates, who is the narrator)", p)]
    # Book I is long; it's split into parts of thirty paragraphs.
    return [{"title": f"Book I, part {n // 30 + 1}", "paragraphs": paras[n:n + 30]} for n in range(0, len(paras), 30)]


def enchiridion(text, count=52):
    block = between(text, r"^\s*THE ENCHIRIDION\s*$")
    parts = re.split(r"\n\s+(" + ROMAN + r")\s*\n", block)
    sections = []
    for k in range(1, len(parts) - 1, 2):
        sections.append({"title": f"Section {parts[k]}", "paragraphs": paragraphs(parts[k + 1])})
        if len(sections) == count:
            break
    return sections


def consolation(text):
    # Book I proper is the second "BOOK I." (the first is the contents).
    starts = [m.start() for m in re.finditer(r"^BOOK I\.\s*$", text, re.M)]
    block = text[starts[-1]:]
    block = block[:re.search(r"^BOOK II\.\s*$", block, re.M).start()]
    pieces = re.split(r"\n\s*\n\s*\n+((?:SONG )?" + ROMAN + r"\.)\s*\n", block)
    sections = []
    for k in range(1, len(pieces) - 1, 2):
        label = pieces[k].rstrip(".")
        paras = [p for p in paragraphs(pieces[k + 1]) if not p.isupper()]
        if paras:
            sections.append({"title": ("Song " + label[5:] if label.startswith("SONG") else "Prose " + label), "paragraphs": paras})
    return sections


BOOKS = [
    {"slug": "meditations", "id": 2680, "title": "Meditations", "author": "Marcus Aurelius", "translator": "Meric Casaubon", "pick": meditations},
    {"slug": "aesop", "id": 21, "title": "Aesop's Fables", "author": "Aesop", "translator": "George Fyler Townsend", "pick": aesop},
    {"slug": "odyssey", "id": 1727, "title": "The Odyssey", "author": "Homer", "translator": "Samuel Butler", "pick": odyssey},
    {"slug": "republic", "id": 1497, "title": "The Republic", "author": "Plato", "translator": "Benjamin Jowett", "pick": republic},
    {"slug": "enchiridion", "id": 45109, "title": "The Enchiridion", "author": "Epictetus", "translator": "Thomas Wentworth Higginson", "pick": enchiridion},
    {"slug": "consolation", "id": 14328, "title": "The Consolation of Philosophy", "author": "Boethius", "translator": "H. R. James", "pick": consolation},
]


def quote(value):
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def write(book, sections):
    lines = [
        f"# Built by scripts/typing-speed/build-books.py from Project Gutenberg #{book['id']}; don't edit by hand.",
        f"title: {quote(book['title'])}",
        f"author: {quote(book['author'])}",
        f"translator: {quote(book['translator'])}",
        f"source: {quote('https://www.gutenberg.org/ebooks/' + str(book['id']))}",
        "sections:",
    ]
    for section in sections:
        lines.append(f"  - title: {quote(section['title'])}")
        lines.append("    paragraphs:")
        lines += [f"      - {quote(p)}" for p in section["paragraphs"]]
    (OUT / f"{book['slug']}.yaml").write_text("\n".join(lines) + "\n")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for book in BOOKS:
        sections = [s for s in book["pick"](fetch(book["id"])) if s["paragraphs"]]
        write(book, sections)
        words = sum(len(p.split()) for s in sections for p in s["paragraphs"])
        print(f"{book['slug']}: {len(sections)} sections, about {words} words")
        time.sleep(2)


if __name__ == "__main__":
    main()
