#!/usr/bin/env python3
"""Build a Commander deck's data file from a plain decklist and Scryfall.

    make deck                    # every list in scripts/mtg/decks/
    python3 scripts/mtg/build-deck.py scripts/mtg/decks/kami.txt

The decklist is the Moxfield / MTGO text export: "1 Card Name" per line, or
"33 Island (THS) 236" to pin a printing (set code and collector number), which
the card viewer then shows instead of Scryfall's default.
The first card is the commander. A line starting with "--" opens a new
section (the export's "--Potentials--" becomes "considering"); cards after
it are cards I'm thinking about, not cards in the deck.

Writes data/mtg-deck/<name>.json, which layouts/shortcodes/mtg-deck/list.html
reads, and saves each card's scan (Scryfall's "normal" size, 488x680) to
assets/img/mtg-deck/cards/<slug>.jpg for the card viewer. Scans already on
disk are kept, so a rerun only downloads new cards; Hugo makes the WebP. Everything in it comes from Scryfall (type line, mana cost, mana value,
rules text) plus the counts worked out here, so the page never needs a
hand-typed number. The file is generated: edit the decklist and rerun.

Scryfall asks for an honest User-Agent, an Accept header and no more than ten
requests a second; a 76-card deck is two requests.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DECKS = ROOT / "scripts" / "mtg" / "decks"
OUT = ROOT / "data" / "mtg-deck"
SCANS = ROOT / "assets" / "img" / "mtg-deck" / "cards"
API = "https://api.scryfall.com/cards/collection"
USER_AGENT = "wrightfunctions-decks/1.0 (+https://wrightfunctions.com)"

# A card sits in the first group its type line matches, so an artifact
# creature is a creature, the way deck sites group them.
GROUPS = [
    ("creature", "Creatures"),
    ("planeswalker", "Planeswalkers"),
    ("instant", "Instants"),
    ("sorcery", "Sorceries"),
    ("artifact", "Artifacts"),
    ("enchantment", "Enchantments"),
    ("land", "Lands"),
]


def parse(path: Path) -> list[dict]:
    """Read the decklist into rows of {qty, name, section}."""
    rows, section = [], "main"
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("--"):
            section = "considering" if "potential" in line.lower() else line.strip("- ").lower()
            continue
        m = re.match(r"^(\d+)x?\s+(.+?)(?:\s+\(([A-Za-z0-9]+)\)\s+(\S+))?\s*$", line)
        if not m:
            sys.exit(f"build-deck: can't read line {raw!r} in {path.name}")
        row = {"qty": int(m[1]), "name": m[2], "section": section}
        if m[3]:
            row["print"] = (m[3].lower(), m[4])
        rows.append(row)
    if not rows:
        sys.exit(f"build-deck: {path.name} has no cards")
    return rows


def key_of(row: dict) -> str:
    """How a row finds its card in fetch()'s result: by printing if pinned."""
    return "{}/{}".format(*row["print"]) if "print" in row else row["name"].lower()


def fetch(rows: list[dict]) -> dict[str, dict]:
    """Look every card up on Scryfall, 75 to a request."""
    found: dict[str, dict] = {}
    idents = {}
    for r in rows:
        if "print" in r:
            idents[key_of(r)] = {"set": r["print"][0], "collector_number": r["print"][1]}
        else:
            idents.setdefault(key_of(r), {"name": r["name"]})
    unique = list(idents.values())
    for i in range(0, len(unique), 75):
        body = json.dumps({"identifiers": unique[i:i + 75]}).encode()
        req = urllib.request.Request(API, data=body, method="POST", headers={
            "User-Agent": USER_AGENT, "Accept": "application/json", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as res:
            payload = json.load(res)
        if payload.get("not_found"):
            missing = ", ".join(x.get("name") or "{set} #{collector_number}".format(**x) for x in payload["not_found"])
            sys.exit(f"build-deck: Scryfall doesn't know: {missing}")
        for card in payload["data"]:
            found["{}/{}".format(card["set"], card["collector_number"])] = card
            found.setdefault(card["name"].lower(), card)
            # A double-faced card is found by its front face's name too.
            front = card["name"].split(" // ")[0]
            found.setdefault(front.lower(), card)
        time.sleep(0.15)
    return found


def face(card: dict, key: str) -> str:
    if key in card:
        return card[key]
    faces = card.get("card_faces") or [{}]
    return " // ".join(f.get(key, "") for f in faces if f.get(key))


def slug_of(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def scan_url(card: dict) -> str:
    uris = card.get("image_uris") or (card.get("card_faces") or [{}])[0].get("image_uris") or {}
    return uris.get("normal", "")


def scan_of(row: dict, card: dict) -> str:
    """The scan's file name: the card's slug, plus the printing when pinned."""
    slug = slug_of(card["name"])
    return f"{slug}-{card['set']}-{card['collector_number']}" if "print" in row else slug


def save_scan(row: dict, card: dict) -> None:
    """Download the card's scan once; a scan already on disk is left alone."""
    dest = SCANS / f"{scan_of(row, card)}.jpg"
    url = scan_url(card)
    if dest.exists() or not url:
        return
    SCANS.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
    with urllib.request.urlopen(req, timeout=30) as res:
        dest.write_bytes(res.read())
    time.sleep(0.1)


def group_of(type_line: str) -> str:
    front = type_line.split(" // ")[0].lower()
    for key, _ in GROUPS:
        if key in front:
            return key
    return "other"


def card_entry(row: dict, card: dict) -> dict:
    type_line = face(card, "type_line")
    return {
        "qty": row["qty"],
        "name": card["name"],
        "slug": slug_of(card["name"]),
        "scan": scan_of(row, card),
        "cost": face(card, "mana_cost").split(" // ")[0],
        "mv": card.get("cmc", 0),
        "type": type_line,
        "group": group_of(type_line),
        "text": face(card, "oracle_text"),
        "url": card["scryfall_uri"].split("?")[0],
    }


def build(path: Path) -> Path:
    rows = parse(path)
    cards = fetch(rows)
    try:
        entries = [(r, card_entry(r, cards[key_of(r)])) for r in rows]
    except KeyError as e:
        sys.exit(f"build-deck: no Scryfall match for {e}")

    for r, _ in entries:
        save_scan(r, cards[key_of(r)])

    commander_row, commander = entries[0]
    main = [e for r, e in entries[1:] if r["section"] == "main"]
    considering = [e for r, e in entries if r["section"] == "considering"]
    in_deck = {e["name"] for e in main} | {commander["name"]}
    for e in considering:
        e["in_deck"] = e["name"] in in_deck  # the export lists a card twice sometimes

    groups = []
    for key, label in GROUPS + [("other", "Other")]:
        members = sorted((e for e in main if e["group"] == key), key=lambda e: (e["mv"], e["name"]))
        if members:
            groups.append({"key": key, "label": label, "count": sum(e["qty"] for e in members), "cards": members})

    spells = [e for e in main + [commander] if e["group"] != "land"]
    curve = Counter()
    for e in spells:
        curve[min(int(e["mv"]), 7)] += e["qty"]
    spell_count = sum(e["qty"] for e in spells)
    art = (cards[key_of(rows[0])].get("image_uris") or {}).get("art_crop", "")

    data = {
        "_generated": f"by scripts/mtg/build-deck.py from scripts/mtg/decks/{path.name}; edit the list and rerun `make deck`",
        "commander": commander | {"artist": cards[key_of(rows[0])].get("artist", ""), "art": art},
        "total": 1 + sum(e["qty"] for e in main),
        "lands": sum(e["qty"] for e in main if e["group"] == "land"),
        "spells": spell_count,
        "average_mv": round(sum(e["mv"] * e["qty"] for e in spells) / spell_count, 2) if spell_count else 0,
        "curve": [{"mv": f"{i}+" if i == 7 else str(i), "count": curve.get(i, 0)} for i in range(8)],
        "groups": groups,
        "considering": considering,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{path.stem}.json"
    out.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"build-deck: {path.name} -> {out.relative_to(ROOT)} ({data['total']} cards, {len(considering)} considering)")
    return out


def main(argv: list[str]) -> None:
    paths = [Path(a) for a in argv] or sorted(DECKS.glob("*.txt"))
    if not paths:
        sys.exit(f"build-deck: no decklists in {DECKS.relative_to(ROOT)}")
    for p in paths:
        build(p)


if __name__ == "__main__":
    main(sys.argv[1:])
