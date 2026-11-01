#!/usr/bin/env python3
"""Build a Yu-Gi-Oh! deck's data file from a plain decklist and YGOPRODeck.

    make deck                    # every list here and in scripts/mtg/decks/
    python3 scripts/ygo/build-deck.py scripts/ygo/decks/stall-burn.txt

The decklist is "3 Card Name" per line, main deck only. Writes
data/ygo-deck/<name>.json, which layouts/shortcodes/ygo-deck/list.html reads,
and saves each card's image to assets/img/ygo-deck/cards/<slug>.jpg (images
already on disk are kept, so a rerun only downloads new cards; Hugo makes the
WebP). Card text, types and stats all come from the YGOPRODeck API, so the
page never needs a hand-typed number. The file is generated: edit the
decklist and rerun.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DECKS = ROOT / "scripts" / "ygo" / "decks"
OUT = ROOT / "data" / "ygo-deck"
IMAGES = ROOT / "assets" / "img" / "ygo-deck" / "cards"
API = "https://db.ygoprodeck.com/api/v7/cardinfo.php"
USER_AGENT = "wrightfunctions-decks/1.0 (+https://wrightfunctions.com)"

# The three piles every Yu-Gi-Oh! deck list shows, matched on the API's type.
GROUPS = [("monster", "Monsters"), ("spell", "Spells"), ("trap", "Traps")]


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def parse(path: Path) -> list[tuple[int, str]]:
    rows = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        qty, _, name = line.partition(" ")
        rows.append((int(qty), name.strip()))
    return rows


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def build(path: Path) -> None:
    rows = parse(path)
    names = "|".join(name for _, name in rows)
    found = json.loads(fetch(f"{API}?{urllib.parse.urlencode({'name': names})}"))["data"]
    by_name = {card["name"].lower(): card for card in found}
    groups = {key: [] for key, _ in GROUPS}
    for qty, name in rows:
        card = by_name.get(name.lower())
        if card is None:
            sys.exit(f"{path.name}: YGOPRODeck has no card named {name!r}")
        slug = slugify(card["name"])
        image = IMAGES / f"{slug}.jpg"
        if not image.exists():
            image.write_bytes(fetch(card["card_images"][0]["image_url"]))
        key = next(k for k, _ in GROUPS if k in card["type"].lower())
        groups[key].append({
            "qty": qty,
            "name": card["name"],
            "slug": slug,
            "type": card["type"],
            "kind": card.get("race", ""),
            "level": card.get("level"),
            "atk": card.get("atk"),
            "def": card.get("def"),
            "text": card["desc"],
            "url": card.get("ygoprodeck_url", ""),
        })
    for cards in groups.values():
        cards.sort(key=lambda c: (-(c["level"] or 0), c["name"]))
    data = {
        "_generated": f"by scripts/ygo/build-deck.py from scripts/ygo/decks/{path.name}; edit the list, not this file",
        "total": sum(qty for qty, _ in rows),
        "groups": [{"key": key, "label": label, "count": sum(c["qty"] for c in groups[key]), "cards": groups[key]}
                   for key, label in GROUPS if groups[key]],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{path.stem}.json").write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{path.stem}: {data['total']} cards -> data/ygo-deck/{path.stem}.json")


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    paths = [Path(p) for p in sys.argv[1:]] or sorted(DECKS.glob("*.txt"))
    for path in paths:
        build(path)


if __name__ == "__main__":
    main()
